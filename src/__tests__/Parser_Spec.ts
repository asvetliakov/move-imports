import { Parser } from "../Parser";

let parser: Parser;

beforeEach(() => {
    parser = new Parser(["require", "require.actual", "jest.mock"]);
});

it("returns empty reference array if source is empty", () => {
    expect(parser.getReferences("")).toEqual([]);
});

it("returns references for es6 imports and re-exports", () => {
    const source = `
    import a from "./a";
    import { b, c } from "b";
    import * as c from "../c";
    import { default as d } from "d/test";

    export class A {}
    const B = {};

    export * from "./e";
    export { B };
    `;
    expect(parser.getReferences(source)).toMatchSnapshot();
});

it("Returns references for require-like calls if they are defined as expression references", () => {
    const source = `
    require("a");
    const b = require("b");
    const { c } = require("../c");
    const d = require("d"),
        { e } = require("./e");

    require.actual("aa");
    require.nonactual("ab");
    const f = another("k");

    jest.mock("a");
    jest.dontMock("b");
    `;
    expect(parser.getReferences(source)).toMatchSnapshot();
});

it("Skips syntax errors", () => {
    const source = `
    import a from "./a";
    impor { b } from "./b";
    import * as from "./c";
    requir(;;

    export * from "../aa";
    `;
    expect(parser.getReferences(source)).toMatchSnapshot();
});