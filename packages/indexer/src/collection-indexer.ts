import { CollationOptions, Collection, IndexDescription, IndexDirection, MongoServerError } from "@ldb/mongo";

type AcceptedFilters = Pick<Partial<IndexDescription>, "key" | "name"> | { [key: string]: IndexDirection } | string;

export class CollectionIndexer {
    private readonly collection: Collection;

    constructor(collection: Collection) {
        this.collection = collection;
    }

    async deployIndex(indexDescription: IndexDescription): Promise<string> {
        let indexName: string;
        try {
            /** Try create index right away */
            indexName = await this.createIndex(indexDescription);
        } catch (error: unknown) {
            /** Errors other than
             *  - [85] IndexOptionConflict
             *  - [86] IndexKeySpecsConflict
             *  are not expected, throw
             */
            if (error instanceof MongoServerError && error.code !== 85 && error.code !== 86) {
                throw error;
            }

            await this.dropIndex(indexDescription);
            indexName = await this.createIndex(indexDescription);
        }
        return indexName;
    }

    async createIndex(indexDescription: IndexDescription): Promise<string> {
        const { key, ...options } = indexDescription;
        options.name = this.generateIndexName(indexDescription);
        return this.collection.createIndex(key, options);
    }

    private generateIndexName(indexDescription: IndexDescription): string {
        const { key, unique, sparse, partialFilterExpression, expireAfterSeconds, collation } = indexDescription;

        /** Default _id index name */
        if (JSON.stringify(key) === JSON.stringify({ _id: 1 })) {
            return "_id_";
        }

        /** Build index name */
        let name = "IX";

        /** Unique index prefix */
        name = unique ? `U${name}` : name;

        /** Sparse index prefix */
        name = sparse ? `S${name}` : name;

        /** Filter index prefix */
        name = partialFilterExpression ? `F${name}` : name;

        /** TTL index prefix */
        name = typeof expireAfterSeconds === "number" ? `TTL_${name}` : name;

        /** Index name:
         *    [TTL]_[F][S][U]IX_[CollectionName]_[Keys]_[Collation]
         */
        name = [name, this.collection.collectionName, this.generateKeysName(key), this.generateCollationName(collation)]
            .filter(Boolean)
            .join("_");

        return name;
    }

    private generateKeysName(key: IndexDescription["key"]): string {
        return Object.entries(key).map(this.mapKeyEntries).join("_");
    }

    private mapKeyEntries([key, value]: [string, IndexDirection]): string {
        /** - Omit value when is default IndexDirection = 1
         *  - Key entry will be mapped to "key$value" string
         */
        return [key, value === 1 ? null : value].filter(Boolean).join("$");
    }

    private generateCollationName(collation?: CollationOptions): string {
        /** Return empty string of no collation provided */
        if (!collation) {
            return "";
        }

        /** Collation name is a "locale_strength" string */
        return [collation.locale, collation.strength].filter(Boolean).join("_");
    }

    async dropIndex(indexDescription: IndexDescription): Promise<boolean> {
        const realFilter: Partial<IndexDescription> = this.buildFilter(indexDescription);
        const svrIndex = await this.getIndex(realFilter);

        /** If no correct index on server, return */
        if (!svrIndex || !svrIndex.name) {
            return false;
        }

        /** Drop index by name */
        await this.collection.dropIndex(svrIndex.name);
        return true;
    }

    private buildFilter<F extends AcceptedFilters>(input?: F): Partial<IndexDescription> {
        /** No inputs return empty filter */
        if (!input) {
            return {};
        }

        /** Treat string filter as index name */
        if (typeof input === "string") {
            return { name: input };
        }

        /** If input is an object with key is object, it is IndexDescription */
        if (typeof input === "object" && typeof input.key === "object") {
            return { key: input.key };
        }

        /** Other case, the whole input must be index keys definition */
        return { key: input } as Pick<Partial<IndexDescription>, "key">;
    }

    async getIndex<F extends AcceptedFilters>(filter?: F): Promise<IndexDescription> {
        const realFilter: Partial<IndexDescription> = this.buildFilter(filter);

        return (await this.getIndexes(realFilter))[0];
    }
    async getIndexes(filter?: Partial<IndexDescription>): Promise<IndexDescription[]> {
        /** Fetch indexes from server */
        const indexes: IndexDescription[] = await this.collection.listIndexes().toArray();

        return this.filterIndexes(indexes, filter);
    }
    private filterIndexes(indexes: IndexDescription[], filter?: Partial<IndexDescription>): IndexDescription[] {
        /** Skip if no filters provided */
        if (!filter) {
            return indexes;
        }

        /** Priority 1: filter by key */
        if (filter.key) {
            return indexes.filter(({ key }) => JSON.stringify(key) === JSON.stringify(filter.key));
        }

        /** Priority 2: filter by name */
        if (filter.name) {
            return indexes.filter((idx) => idx.name === filter.name);
        }

        /** Ignore others
         *    TODO: Filter by options too
         */
        return indexes;
    }
}
