import { compiler } from "../src";

describe("Compilation for ", () => {
  it("a new type declaration", () => {
    expect(compiler()).toMatchSnapshot();
  });
  it("already compiled type declaration without additional code of developer", () => {
    expect(compiler()).toMatchSnapshot();
  });
  it("already compiled type declaration with additional code which was wrote by developers", () => {
    expect(compiler()).toMatchSnapshot();
  });
});
