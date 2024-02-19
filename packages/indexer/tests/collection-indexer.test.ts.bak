/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from "@jest/globals";
import { IndexDescription } from "mongodb";
import { CollectionIndexer } from "../src";

afterEach(() => {
    jest.clearAllMocks();
});

describe("[Class CollectionIndexer]", () => {
    it("Init sequence", () => {
        const mockCollection: any = { this: "Collection" };
        const indexer = new CollectionIndexer(mockCollection);

        expect((indexer as any).collection).toEqual(mockCollection);
    });

    describe("Name generator", () => {
        const mockCollection: any = { collectionName: "unit_test" };
        const indexer = new CollectionIndexer(mockCollection);

        const key = { field: 1 };
        const unique = true;
        const sparse = true;
        const partialFilterExpression = { field: { $gt: 0 } };
        const expireAfterSeconds = 3600;

        const testCases: [string, IndexDescription, string][] = [
            ["_id", { key: { _id: 1 } }, "_id_"],
            ["Normal", { key }, "IX_unit_test_field"],
            ["Unique", { key, unique }, "UIX_unit_test_field"],
            ["Sparse", { key, sparse }, "SIX_unit_test_field"],
            ["Filtered", { key, partialFilterExpression }, "FIX_unit_test_field"],
            ["TTL", { key, expireAfterSeconds }, "TTL_IX_unit_test_field"],
            ["TTL invalid", { key, expireAfterSeconds: "3600" } as any, "IX_unit_test_field"],
            ["Sparse Unique", { key, unique, sparse }, "SUIX_unit_test_field"],
            ["Filtered Unique", { key, unique, partialFilterExpression }, "FUIX_unit_test_field"],
            ["TTL Unique ", { key, unique, expireAfterSeconds }, "TTL_UIX_unit_test_field"],
            ["TTL Sparse", { key, sparse, expireAfterSeconds }, "TTL_SIX_unit_test_field"],
            ["TTL Fitlered", { key, partialFilterExpression, expireAfterSeconds }, "TTL_FIX_unit_test_field"],
            ["TTL Sparse Unique", { key, unique, sparse, expireAfterSeconds }, "TTL_SUIX_unit_test_field"],
            ["TTL Fitlered Unique", { key, unique, partialFilterExpression, expireAfterSeconds }, "TTL_FUIX_unit_test_field"],
            ["Collation simple", { key, collation: { locale: "simple" } }, "IX_unit_test_field_simple"],
            ["Collation en", { key, collation: { locale: "en" } }, "IX_unit_test_field_en"],
            ["Collation en case insensitive", { key, collation: { locale: "en", strength: 2 } }, "IX_unit_test_field_en_2"],
            ["Multiple keys", { key: { field: 1, test: 1 } }, "IX_unit_test_field_test"],
            ["Special key direction", { key: { field: 2, test: 1 } }, "IX_unit_test_field$2_test"],
            ["Special key direction", { key: { field: 1, test: -1 } }, "IX_unit_test_field_test$-1"],
            ["Special key direction", { key: { field: 1, test: "text" } }, "IX_unit_test_field_test$text"],
        ];

        for (const [testCase, indexDescription, output] of testCases) {
            it(testCase, () => {
                const result: string = (indexer as any).generateIndexName(indexDescription);
                expect(result).toEqual(output);
            });
        }
    });
});
