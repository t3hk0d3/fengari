"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

const dostring = `
    local function dostring (x) return assert(load(x), "")() end
`;

test("[test-suite] literals: dostring", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        dostring("x \\v\\f = \\t\\r 'a\\0a' \\v\\f\\f")
        assert(x == 'a\\0a' and string.len(x) == 3)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(dostring + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


// TODO: bell character '\a' in JS is parsed as 'a'
test("[test-suite] literals: escape sequences", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert('\\n\\"\\'\\\\' == [[

"'\\]])
        assert(string.find("\\b\\f\\n\\r\\t\\v", "^%c%c%c%c%c%c$"))
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] literals: assume ASCII just for tests", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert("\\09912" == 'c12')
        assert("\\99ab" == 'cab')
        assert("\\099" == '\\99')
        assert("\\099\\n" == 'c\\10')
        assert('\\0\\0\\0alo' == '\\0' .. '\\0\\0' .. 'alo')

        assert(010 .. 020 .. -030 == "1020-30")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test("[test-suite] literals: Error in escape sequences", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function lexerror (s, err)
          local st, msg = load('return ' .. s, '')
          if err ~= '<eof>' then err = err .. "'" end
          assert(not st and string.find(msg, "near .-" .. err))
        end

        lexerror([["abc\\x"]], [[\\x"]])
        lexerror([["abc\\x]], [[\\x]])
        lexerror([["\\x]], [[\\x]])
        lexerror([["\\x5"]], [[\\x5"]])
        lexerror([["\\x5]], [[\\x5]])
        lexerror([["\\xr"]], [[\\xr]])
        lexerror([["\\xr]], [[\\xr]])
        lexerror([["\\x.]], [[\\x.]])
        lexerror([["\\x8%"]], [[\\x8%%]])
        lexerror([["\\xAG]], [[\\xAG]])
        lexerror([["\\g"]], [[\\g]])
        lexerror([["\\g]], [[\\g]])
        lexerror([["\\."]], [[\\%.]])

        lexerror([["\\999"]], [[\\999"]])
        lexerror([["xyz\\300"]], [[\\300"]])
        lexerror([["   \\256"]], [[\\256"]])

        -- errors in UTF-8 sequences
        lexerror([["abc\\u{110000}"]], [[abc\\u{110000]])   -- too large
        lexerror([["abc\\u11r"]], [[abc\\u1]])    -- missing '{'
        lexerror([["abc\\u"]], [[abc\\u"]])    -- missing '{'
        lexerror([["abc\\u{11r"]], [[abc\\u{11r]])    -- missing '}'
        lexerror([["abc\\u{11"]], [[abc\\u{11"]])    -- missing '}'
        lexerror([["abc\\u{11]], [[abc\\u{11]])    -- missing '}'
        lexerror([["abc\\u{r"]], [[abc\\u{r]])     -- no digits

        -- unfinished strings
        lexerror("[=[alo]]", "<eof>")
        lexerror("[=[alo]=", "<eof>")
        lexerror("[=[alo]", "<eof>")
        lexerror("'alo", "<eof>")
        lexerror("'alo \\\\z  \\n\\n", "<eof>")
        lexerror("'alo \\\\z", "<eof>")
        lexerror([['alo \\98]], "<eof>")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] literals: valid characters in variable names", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        for i = 0, 255 do
          local s = string.char(i)
          assert(not string.find(s, "[a-zA-Z_]") == not load(s .. "=1", ""))
          assert(not string.find(s, "[a-zA-Z_0-9]") ==
                 not load("a" .. s .. "1 = 1", ""))
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] literals: long variable names", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        var1 = string.rep('a', 15000) .. '1'
        var2 = string.rep('a', 15000) .. '2'
        prog = string.format([[
          %s = 5
          %s = %s + 1
          return function () return %s - %s end
        ]], var1, var2, var1, var1, var2)
        local f = dostring(prog)
        assert(_G[var1] == 5 and _G[var2] == 6 and f() == -1)
        var1, var2, f = nil
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(dostring + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] literals: escapes", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `assert("\\n\\t" == [[\n\n\t]])
assert([[\n\n $debug]] == "\\n $debug")
assert([[ [ ]] ~= [[ ] ]])`;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(dostring + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] literals: long strings", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `b = "001234567890123456789012345678901234567891234567890123456789012345678901234567890012345678901234567890123456789012345678912345678901234567890123456789012345678900123456789012345678901234567890123456789123456789012345678901234567890123456789001234567890123456789012345678901234567891234567890123456789012345678901234567890012345678901234567890123456789012345678912345678901234567890123456789012345678900123456789012345678901234567890123456789123456789012345678901234567890123456789001234567890123456789012345678901234567891234567890123456789012345678901234567890012345678901234567890123456789012345678912345678901234567890123456789012345678900123456789012345678901234567890123456789123456789012345678901234567890123456789001234567890123456789012345678901234567891234567890123456789012345678901234567890012345678901234567890123456789012345678912345678901234567890123456789012345678900123456789012345678901234567890123456789123456789012345678901234567890123456789"
assert(string.len(b) == 960)
prog = [=[

a1 = [["this is a 'string' with several 'quotes'"]]
a2 = "'quotes'"

assert(string.find(a1, a2) == 34)

a1 = [==[temp = [[an arbitrary value]]; ]==]
assert(load(a1))()
assert(temp == 'an arbitrary value')
-- long strings --
b = "001234567890123456789012345678901234567891234567890123456789012345678901234567890012345678901234567890123456789012345678912345678901234567890123456789012345678900123456789012345678901234567890123456789123456789012345678901234567890123456789001234567890123456789012345678901234567891234567890123456789012345678901234567890012345678901234567890123456789012345678912345678901234567890123456789012345678900123456789012345678901234567890123456789123456789012345678901234567890123456789001234567890123456789012345678901234567891234567890123456789012345678901234567890012345678901234567890123456789012345678912345678901234567890123456789012345678900123456789012345678901234567890123456789123456789012345678901234567890123456789001234567890123456789012345678901234567891234567890123456789012345678901234567890012345678901234567890123456789012345678912345678901234567890123456789012345678900123456789012345678901234567890123456789123456789012345678901234567890123456789"
assert(string.len(b) == 960)

a = [[00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
00123456789012345678901234567890123456789123456789012345678901234567890123456789
]]
assert(string.len(a) == 1863)
assert(string.sub(a, 1, 40) == string.sub(b, 1, 40))
x = 1
]=]

x = nil
dostring(prog)
assert(x)

prog = nil
a = nil
b = nil`;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(dostring + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test("[test-suite] literals: testing comments and strings with long brackets", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `a = [==[]=]==]
assert(a == "]=")

a = [==[[===[[=[]]=][====[]]===]===]==]
assert(a == "[===[[=[]]=][====[]]===]===")

a = [====[[===[[=[]]=][====[]]===]===]====]
assert(a == "[===[[=[]]=][====[]]===]===")

a = [=[]]]]]]]]]=]
assert(a == "]]]]]]]]")


--[===[
x y z [==[ blu foo
]==
]
]=]==]
error error]=]===]`;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(dostring + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test("[test-suite] literals: testing %q x line ends", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local s = "a string with \\r and \\n and \\r\\n and \\n\\r"
        local c = string.format("return %q", s)
        assert(assert(load(c))() == s)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(dostring + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] literals: testing errors", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(not load"a = 'non-ending string")
        assert(not load"a = 'non-ending string\\n'")
        assert(not load"a = '\\\\345'")
        assert(not load"a = [=x]")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(dostring + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
