"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

const ltests = require('./ltests.js');

// TODO: a lot of gc related tests are skipped
// TODO: io.read is used in several tests, uncomment them when it's implemented

const prefix = `
    local pack = table.pack


    function tcheck (t1, t2)
      assert(t1.n == (t2.n or #t2) + 1)
      for i = 2, t1.n do assert(t1[i] == t2[i - 1]) end
    end


    local function checkerr (msg, f, ...)
      local stat, err = pcall(f, ...)
      assert(not stat and string.find(err, msg))
    end
`;

test("[test-suite] api: absindex", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(T.testC("settop 10; absindex -1; return 1") == 10)
        assert(T.testC("settop 5; absindex -5; return 1") == 1)
        assert(T.testC("settop 10; absindex 1; return 1") == 1)
        assert(T.testC("settop 10; absindex R; return 1") < -10)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing alignment", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        -- Useless tests in fengari since we do the same thing in d2s than in string.pack
        a = T.d2s(12458954321123.0)
        assert(a == string.pack("d", 12458954321123.0))
        assert(T.s2d(a) == 12458954321123.0)

        a,b,c = T.testC("pushnum 1; pushnum 2; pushnum 3; return 2")
        assert(a == 2 and b == 3 and not c)

        f = T.makeCfunc("pushnum 1; pushnum 2; pushnum 3; return 2")
        a,b,c = f()
        assert(a == 2 and b == 3 and not c)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: test that all trues are equal", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a,b,c = T.testC("pushbool 1; pushbool 2; pushbool 0; return 3")
        assert(a == b and a == true and c == false)
        a,b,c = T.testC"pushbool 0; pushbool 10; pushnil;\\
                              tobool -3; tobool -3; tobool -3; return 3"
        assert(a==false and b==true and c==false)


        a,b,c = T.testC("gettop; return 2", 10, 20, 30, 40)
        assert(a == 40 and b == 5 and not c)

        t = pack(T.testC("settop 5; return *", 2, 3))
        tcheck(t, {n=4,2,3})

        t = pack(T.testC("settop 0; settop 15; return 10", 3, 1, 23))
        assert(t.n == 10 and t[1] == nil and t[10] == nil)

        t = pack(T.testC("remove -2; return *", 2, 3, 4))
        tcheck(t, {n=2,2,4})

        t = pack(T.testC("insert -1; return *", 2, 3))
        tcheck(t, {n=2,2,3})

        t = pack(T.testC("insert 3; return *", 2, 3, 4, 5))
        tcheck(t, {n=4,2,5,3,4})

        t = pack(T.testC("replace 2; return *", 2, 3, 4, 5))
        tcheck(t, {n=3,5,3,4})

        t = pack(T.testC("replace -2; return *", 2, 3, 4, 5))
        tcheck(t, {n=3,2,3,5})

        t = pack(T.testC("remove 3; return *", 2, 3, 4, 5))
        tcheck(t, {n=3,2,4,5})

        t = pack(T.testC("copy 3 4; return *", 2, 3, 4, 5))
        tcheck(t, {n=4,2,3,3,5})

        t = pack(T.testC("copy -3 -1; return *", 2, 3, 4, 5))
        tcheck(t, {n=4,2,3,4,3})
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing 'rotate'", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do   -- testing 'rotate'
          local t = {10, 20, 30, 40, 50, 60}
          for i = -6, 6 do
            local s = string.format("rotate 2 %d; return 7", i)
            local t1 = pack(T.testC(s, 10, 20, 30, 40, 50, 60))
            tcheck(t1, t)
            table.insert(t, 1, table.remove(t))
          end

          t = pack(T.testC("rotate -2 1; return *", 10, 20, 30, 40))
          tcheck(t, {10, 20, 40, 30})
          t = pack(T.testC("rotate -2 -1; return *", 10, 20, 30, 40))
          tcheck(t, {10, 20, 40, 30})

          -- some corner cases
          t = pack(T.testC("rotate -1 0; return *", 10, 20, 30, 40))
          tcheck(t, {10, 20, 30, 40})
          t = pack(T.testC("rotate -1 1; return *", 10, 20, 30, 40))
          tcheck(t, {10, 20, 30, 40})
          t = pack(T.testC("rotate 5 -1; return *", 10, 20, 30, 40))
          tcheck(t, {10, 20, 30, 40})
        end
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing non-function message handlers", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local f = T.makeCfunc[[
            getglobal error
            pushstring bola
            pcall 1 1 1   # call 'error' with given handler
            pushstatus
            return 2     # return error message and status
          ]]

          local msg, st = f({})     -- invalid handler
          assert(st == "ERRERR" and string.find(msg, "error handling"))
          local msg, st = f(nil)     -- invalid handler
          assert(st == "ERRERR" and string.find(msg, "error handling"))

          local a = setmetatable({}, {__call = function (_, x) return x:upper() end})
          local msg, st = f(a)   -- callable handler
          assert(st == "ERRRUN" and msg == "BOLA")
        end

        t = pack(T.testC("insert 3; pushvalue 3; remove 3; pushvalue 2; remove 2; \\
                          insert 2; pushvalue 1; remove 1; insert 1; \\
              insert -2; pushvalue -2; remove -3; return *",
              2, 3, 4, 5, 10, 40, 90))
        tcheck(t, {n=7,2,3,4,5,10,40,90})

        t = pack(T.testC("concat 5; return *", "alo", 2, 3, "joao", 12))
        tcheck(t, {n=1,"alo23joao12"})
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing MULTRET", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        t = pack(T.testC("call 2,-1; return *",
             function (a,b) return 1,2,3,4,a,b end, "alo", "joao"))
        tcheck(t, {n=6,1,2,3,4,"alo", "joao"})
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: test returning more results than fit in the caller stack", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do  -- test returning more results than fit in the caller stack
          local a = {}
          for i=1,1000 do a[i] = true end; a[999] = 10
          local b = T.testC([[pcall 1 -1 0; pop 1; tostring -1; return 1]],
                            table.unpack, a)
          assert(b == "10")
        end
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing globals", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        _G.a = 14; _G.b = "a31"
        local a = {T.testC[[
          getglobal a;
          getglobal b;
          getglobal b;
          setglobal a;
          return *
        ]]}
        assert(a[2] == 14 and a[3] == "a31" and a[4] == nil and _G.a == "a31")
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing arith", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(T.testC("pushnum 10; pushnum 20; arith /; return 1") == 0.5)
        assert(T.testC("pushnum 10; pushnum 20; arith -; return 1") == -10)
        assert(T.testC("pushnum 10; pushnum -20; arith *; return 1") == -200)
        assert(T.testC("pushnum 10; pushnum 3; arith ^; return 1") == 1000)
        assert(T.testC("pushnum 10; pushstring 20; arith /; return 1") == 0.5)
        assert(T.testC("pushstring 10; pushnum 20; arith -; return 1") == -10)
        assert(T.testC("pushstring 10; pushstring -20; arith *; return 1") == -200)
        assert(T.testC("pushstring 10; pushstring 3; arith ^; return 1") == 1000)
        assert(T.testC("arith /; return 1", 2, 0) == 10.0/0)
        a = T.testC("pushnum 10; pushint 3; arith \\\\; return 1")
        assert(a == 3.0 and math.type(a) == "float")
        a = T.testC("pushint 10; pushint 3; arith \\\\; return 1")
        assert(a == 3 and math.type(a) == "integer")
        a = assert(T.testC("pushint 10; pushint 3; arith +; return 1"))
        assert(a == 13 and math.type(a) == "integer")
        a = assert(T.testC("pushnum 10; pushint 3; arith +; return 1"))
        assert(a == 13 and math.type(a) == "float")
        a,b,c = T.testC([[pushnum 1;
                          pushstring 10; arith _;
                          pushstring 5; return 3]])
        assert(a == 1 and b == -10 and c == "5")
        mt = {__add = function (a,b) return setmetatable({a[1] + b[1]}, mt) end,
              __mod = function (a,b) return setmetatable({a[1] % b[1]}, mt) end,
              __unm = function (a) return setmetatable({a[1]* 2}, mt) end}
        a,b,c = setmetatable({4}, mt),
                setmetatable({8}, mt),
                setmetatable({-3}, mt)
        x,y,z = T.testC("arith +; return 2", 10, a, b)
        assert(x == 10 and y[1] == 12 and z == nil)
        assert(T.testC("arith %; return 1", a, c)[1] == 4%-3)
        assert(T.testC("arith _; arith +; arith %; return 1", b, a, c)[1] ==
                       8 % (4 + (-3)*2))
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: errors in arithmetic", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkerr("divide by zero", T.testC, "arith \\\\", 10, 0)
        checkerr("%%0", T.testC, "arith %", 10, 0)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing lessthan and lessequal", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(T.testC("compare LT 2 5, return 1", 3, 2, 2, 4, 2, 2))
        assert(T.testC("compare LE 2 5, return 1", 3, 2, 2, 4, 2, 2))
        assert(not T.testC("compare LT 3 4, return 1", 3, 2, 2, 4, 2, 2))
        assert(T.testC("compare LE 3 4, return 1", 3, 2, 2, 4, 2, 2))
        assert(T.testC("compare LT 5 2, return 1", 4, 2, 2, 3, 2, 2))
        assert(not T.testC("compare LT 2 -3, return 1", "4", "2", "2", "3", "2", "2"))
        assert(not T.testC("compare LT -3 2, return 1", "3", "2", "2", "4", "2", "2"))
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: non-valid indices produce false", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(not T.testC("compare LT 1 4, return 1"))
        assert(not T.testC("compare LE 9 1, return 1"))
        assert(not T.testC("compare EQ 9 9, return 1"))

        local b = {__lt = function (a,b) return a[1] < b[1] end}
        local a1,a3,a4 = setmetatable({1}, b),
                         setmetatable({3}, b),
                         setmetatable({4}, b)
        assert(T.testC("compare LT 2 5, return 1", a3, 2, 2, a4, 2, 2))
        assert(T.testC("compare LE 2 5, return 1", a3, 2, 2, a4, 2, 2))
        assert(T.testC("compare LT 5 -6, return 1", a4, 2, 2, a3, 2, 2))
        a,b = T.testC("compare LT 5 -6, return 2", a1, 2, 2, a3, 2, 20)
        assert(a == 20 and b == false)
        a,b = T.testC("compare LE 5 -6, return 2", a1, 2, 2, a3, 2, 20)
        assert(a == 20 and b == false)
        a,b = T.testC("compare LE 5 -6, return 2", a1, 2, 2, a1, 2, 20)
        assert(a == 20 and b == true)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing length", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local t = setmetatable({x = 20}, {__len = function (t) return t.x end})
        a,b,c = T.testC([[
           len 2;
           Llen 2;
           objsize 2;
           return 3
        ]], t)
        assert(a == 20 and b == 20 and c == 0)

        t.x = "234"; t[1] = 20
        a,b,c = T.testC([[
           len 2;
           Llen 2;
           objsize 2;
           return 3
        ]], t)
        assert(a == "234" and b == 234 and c == 1)

        t.x = print; t[1] = 20
        a,c = T.testC([[
           len 2;
           objsize 2;
           return 2
        ]], t)
        assert(a == print and c == 1)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing __concat", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a = setmetatable({x="u"}, {__concat = function (a,b) return a.x..'.'..b.x end})
        x,y = T.testC([[
          pushnum 5
          pushvalue 2;
          pushvalue 2;
          concat 2;
          pushvalue -2;
          return 2;
        ]], a, a)
        assert(x == a..a and y == 5)

        -- concat with 0 elements
        assert(T.testC("concat 0; return 1") == "")

        -- concat with 1 element
        assert(T.testC("concat 1; return 1", "xuxu") == "xuxu")
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing lua_is", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function B(x) return x and 1 or 0 end

        function count (x, n)
          n = n or 2
          local prog = [[
            isnumber %d;
            isstring %d;
            isfunction %d;
            iscfunction %d;
            istable %d;
            isuserdata %d;
            isnil %d;
            isnull %d;
            return 8
          ]]
          prog = string.format(prog, n, n, n, n, n, n, n, n)
          local a,b,c,d,e,f,g,h = T.testC(prog, x)
          return B(a)+B(b)+B(c)+B(d)+B(e)+B(f)+B(g)+(100*B(h))
        end

        assert(count(3) == 2)
        assert(count('alo') == 1)
        assert(count('32') == 2)
        assert(count({}) == 1)
        assert(count(print) == 2)
        assert(count(function () end) == 1)
        assert(count(nil) == 1)
        assert(count(nil, 15) == 100)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing lua_to...", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function to (s, x, n)
          n = n or 2
          return T.testC(string.format("%s %d; return 1", s, n), x)
        end

        local hfunc = string.gmatch("", "")    -- a "heavy C function" (with upvalues)
        assert(to("tostring", {}) == nil)
        assert(to("tostring", "alo") == "alo")
        assert(to("tostring", 12) == "12")
        assert(to("tostring", 12, 3) == nil)
        assert(to("objsize", {}) == 0)
        assert(to("objsize", {1,2,3}) == 3)
        assert(to("objsize", "alo\\0\\0a") == 6)
        assert(to("objsize", T.newuserdata(0)) == 0)
        assert(to("objsize", T.newuserdata(101)) == 101)
        assert(to("objsize", 124) == 0)
        assert(to("objsize", true) == 0)
        assert(to("tonumber", {}) == 0)
        assert(to("tonumber", "12") == 12)
        assert(to("tonumber", "s2") == 0)
        assert(to("tonumber", 1, 20) == 0)
        assert(to("topointer", 10) == 0)
        assert(to("topointer", true) == 0)
        assert(to("topointer", T.pushuserdata(20)) == 20)
        assert(to("topointer", hfunc) ~= 0)        -- "heavy" C function
        assert(to("topointer", function () end) ~= 0)   -- Lua function
        assert(to("func2num", 20) == 0)
        assert(to("func2num", T.pushuserdata(10)) == 0)
        assert(to("func2num", hfunc) ~= 0)  -- "heavy" C function (with upvalue)
        a = to("tocfunction", math.deg)
        assert(a(3) == math.deg(3) and a == math.deg)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test("[test-suite] api: testing panic function", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          -- trivial error
          assert(T.checkpanic("pushstring hi; error") == "hi")

          -- using the stack inside panic
          assert(T.checkpanic("pushstring hi; error;",
            [[checkstack 5 XX
              pushstring ' alo'
              pushstring ' mundo'
              concat 3]]) == "hi alo mundo")

          -- "argerror" without frames
          assert(T.checkpanic("loadstring 4") ==
              "bad argument #4 (string expected, got no value)")


          --[[ TODO: T.totalmem
          -- memory error
          T.totalmem(T.totalmem()+10000)   -- set low memory limit (+10k)
          assert(T.checkpanic("newuserdata 20000") == "not enough memory")
          T.totalmem(0)          -- restore high limit
          ]]

          -- stack error
          if not _soft then
            local msg = T.checkpanic[[
              pushstring "function f() f() end"
              loadstring -1; call 0 0
              getglobal f; call 0 0
            ]]
            assert(string.find(msg, "stack overflow"))
          end

        end
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test.skip("[test-suite] api: testing deep JS stack", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          checkerr("XXXX", T.testC, "checkstack 1000023 XXXX")   -- too deep
          -- too deep (with no message)
          checkerr("^stack overflow$", T.testC, "checkstack 1000023 ''")
          local s = string.rep("pushnil;checkstack 1 XX;", 1000000)
          checkerr("overflow", T.testC, s)
        end

        local lim = _soft and 500 or 12000
        local prog = {"checkstack " .. (lim * 2 + 100) .. "msg", "newtable"}
        for i = 1,lim do
          prog[#prog + 1] = "pushnum " .. i
          prog[#prog + 1] = "pushnum " .. i * 10
        end

        prog[#prog + 1] = "rawgeti R 2"   -- get global table in registry
        prog[#prog + 1] = "insert " .. -(2*lim + 2)

        for i = 1,lim do
          prog[#prog + 1] = "settable " .. -(2*(lim - i + 1) + 1)
        end

        prog[#prog + 1] = "return 2"

        prog = table.concat(prog, ";")
        local g, t = T.testC(prog)
        assert(g == _G)
        for i = 1,lim do assert(t[i] == i*10); t[i] = nil end
        assert(next(t) == nil)
        prog, g, t = nil
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing errors", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a = T.testC([[
          loadstring 2; pcall 0 1 0;
          pushvalue 3; insert -2; pcall 1 1 0;
          pcall 0 0 0;
          return 1
        ]], "x=150", function (a) assert(a==nil); return 3 end)

        assert(type(a) == 'string' and x == 150)

        function check3(p, ...)
          local arg = {...}
          assert(#arg == 3)
          assert(string.find(arg[3], p))
        end
        check3(":1:", T.testC("loadstring 2; return *", "x="))
        check3("%.", T.testC("loadfile 2; return *", "."))
        check3("xxxx", T.testC("loadfile 2; return *", "xxxx"))
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test("[test-suite] api: testing table access", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do   -- getp/setp
          local a = {}
          T.testC("rawsetp 2 1", a, 20)
          assert(a[T.pushuserdata(1)] == 20)
          assert(T.testC("rawgetp 2 1; return 1", a) == 20)
        end

        a = {x=0, y=12}
        x, y = T.testC("gettable 2; pushvalue 4; gettable 2; return 2",
                        a, 3, "y", 4, "x")
        assert(x == 0 and y == 12)
        T.testC("settable -5", a, 3, 4, "x", 15)
        assert(a.x == 15)
        a[a] = print
        x = T.testC("gettable 2; return 1", a)  -- table and key are the same object!
        assert(x == print)
        T.testC("settable 2", a, "x")    -- table and key are the same object!
        assert(a[a] == "x")

        b = setmetatable({p = a}, {})
        getmetatable(b).__index = function (t, i) return t.p[i] end
        k, x = T.testC("gettable 3, return 2", 4, b, 20, 35, "x")
        assert(x == 15 and k == 35)
        k = T.testC("getfield 2 y, return 1", b)
        assert(k == 12)
        getmetatable(b).__index = function (t, i) return a[i] end
        getmetatable(b).__newindex = function (t, i,v ) a[i] = v end
        y = T.testC("insert 2; gettable -5; return 1", 2, 3, 4, "y", b)
        assert(y == 12)
        k = T.testC("settable -5, return 1", b, 3, 4, "x", 16)
        assert(a.x == 16 and k == 4)
        a[b] = 'xuxu'
        y = T.testC("gettable 2, return 1", b)
        assert(y == 'xuxu')
        T.testC("settable 2", b, 19)
        assert(a[b] == 19)

    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing getfield/setfield with long keys", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do   -- testing getfield/setfield with long keys
          local t = {_012345678901234567890123456789012345678901234567890123456789 = 32}
          local a = T.testC([[
            getfield 2 _012345678901234567890123456789012345678901234567890123456789
            return 1
          ]], t)
          assert(a == 32)
          local a = T.testC([[
            pushnum 33
            setglobal _012345678901234567890123456789012345678901234567890123456789
          ]])
          assert(_012345678901234567890123456789012345678901234567890123456789 == 33)
          _012345678901234567890123456789012345678901234567890123456789 = nil
        end
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing next", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a = {}
        t = pack(T.testC("next; return *", a, nil))
        tcheck(t, {n=1,a})
        a = {a=3}
        t = pack(T.testC("next; return *", a, nil))
        tcheck(t, {n=3,a,'a',3})
        t = pack(T.testC("next; pop 1; next; return *", a, nil))
        tcheck(t, {n=1,a})
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing upvalues", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local A = T.testC[[ pushnum 10; pushnum 20; pushcclosure 2; return 1]]
          t, b, c = A([[pushvalue U0; pushvalue U1; pushvalue U2; return 3]])
          assert(b == 10 and c == 20 and type(t) == 'table')
          a, b = A([[tostring U3; tonumber U4; return 2]])
          assert(a == nil and b == 0)
          A([[pushnum 100; pushnum 200; replace U2; replace U1]])
          b, c = A([[pushvalue U1; pushvalue U2; return 2]])
          assert(b == 100 and c == 200)
          A([[replace U2; replace U1]], {x=1}, {x=2})
          b, c = A([[pushvalue U1; pushvalue U2; return 2]])
          assert(b.x == 1 and c.x == 2)
          -- T.checkmemory()
        end
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: testing absent upvalues from JS-function pointers", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(T.testC[[isnull U1; return 1]] == true)
        assert(T.testC[[isnull U100; return 1]] == true)
        assert(T.testC[[pushvalue U1; return 1]] == nil)

        local f = T.testC[[ pushnum 10; pushnum 20; pushcclosure 2; return 1]]
        assert(T.upvalue(f, 1) == 10 and
               T.upvalue(f, 2) == 20 and
               T.upvalue(f, 3) == nil)
        T.upvalue(f, 2, "xuxu")
        assert(T.upvalue(f, 2) == "xuxu")
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] api: large closures", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local A = "checkstack 300 msg;" ..
                    string.rep("pushnum 10;", 255) ..
                    "pushcclosure 255; return 1"
          A = T.testC(A)
          for i=1,255 do
            assert(A(("pushvalue U%d; return 1"):format(i)) == 10)
          end
          assert(A("isnull U256; return 1"))
          assert(not A("isnil U256; return 1"))
        end
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test.skip("[test-suite] api: reuse of references", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local i = T.ref{}
        T.unref(i)
        assert(T.ref{} == i)

        Arr = {}
        Lim = 100
        for i=1,Lim do   -- lock many objects
          Arr[i] = T.ref({})
        end

        assert(T.ref(nil) == -1 and T.getref(-1) == nil)
        T.unref(-1); T.unref(-1)

        for i=1,Lim do   -- unlock all them
          T.unref(Arr[i])
        end

        function printlocks ()
          local f = T.makeCfunc("gettable R; return 1")
          local n = f("n")
          print("n", n)
          for i=0,n do
            print(i, f(i))
          end
        end


        for i=1,Lim do   -- lock many objects
          Arr[i] = T.ref({})
        end

        for i=1,Lim,2 do   -- unlock half of them
          T.unref(Arr[i])
        end

        assert(type(T.getref(Arr[2])) == 'table')


        assert(T.getref(-1) == nil)


        a = T.ref({})

        -- collectgarbage()

        assert(type(T.getref(a)) == 'table')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test("[test-suite] api: testing lua_equal", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(T.testC("compare EQ 2 4; return 1", print, 1, print, 20))
        assert(T.testC("compare EQ 3 2; return 1", 'alo', "alo"))
        assert(T.testC("compare EQ 2 3; return 1", nil, nil))
        assert(not T.testC("compare EQ 2 3; return 1", {}, {}))
        assert(not T.testC("compare EQ 2 3; return 1"))
        assert(not T.testC("compare EQ 2 3; return 1", 3))
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test("[test-suite] api: test for userdata vals", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local a = {}; local lim = 30
          for i=0,lim do a[i] = T.pushuserdata(i) end
          for i=0,lim do assert(T.udataval(a[i]) == i) end
          for i=0,lim do assert(T.pushuserdata(i) == a[i]) end
          for i=0,lim do a[a[i]] = i end
          for i=0,lim do a[T.pushuserdata(i)] = i end
          assert(type(tostring(a[1])) == "string")
        end
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test.skip("[test-suite] api: testing memory limits", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkerr("block too big", T.newuserdata, math.maxinteger)
        collectgarbage()
        T.totalmem(T.totalmem()+5000)   -- set low memory limit (+5k)
        checkerr("not enough memory", load"local a={}; for i=1,100000 do a[i]=i end")
        T.totalmem(0)          -- restore high limit
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


const memprefix = `
    -- test memory errors; increase memory limit in small steps, so that
    -- we get memory errors in different parts of a given task, up to there
    -- is enough memory to complete the task without errors
    function testamem (s, f)
      collectgarbage(); collectgarbage()
      local M = T.totalmem()
      local oldM = M
      local a,b = nil
      while 1 do
        M = M+7   -- increase memory limit in small steps
        T.totalmem(M)
        a, b = pcall(f)
        T.totalmem(0)  -- restore high limit
        if a and b then break end       -- stop when no more errors
        collectgarbage()
        if not a and not    -- 'real' error?
          (string.find(b, "memory") or string.find(b, "overflow")) then
          error(b, 0)   -- propagate it
        end
      end
      print("\\nlimit for " .. s .. ": " .. M-oldM)
      return b
    end
`;


test.skip("[test-suite] api: testing memory errors when creating a new state", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        b = testamem("state creation", T.newstate)
        T.closestate(b);  -- close new state
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + memprefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test.skip("[test-suite] api: test thread creation after stressing GC", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function expand (n,s)
          if n==0 then return "" end
          local e = string.rep("=", n)
          return string.format("T.doonnewstack([%s[ %s;\\n collectgarbage(); %s]%s])\\n",
                                      e, s, expand(n-1,s), e)
        end

        G=0; collectgarbage(); a =collectgarbage("count")
        load(expand(20,"G=G+1"))()
        assert(G==20); collectgarbage();  -- assert(gcinfo() <= a+1)

        testamem("thread creation", function ()
          return T.doonnewstack("x=1") == 0  -- try to create thread
        end)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + memprefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test.skip("[test-suite] api: testing memory x compiler", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        testamem("loadstring", function ()
          return load("x=1")  -- try to do load a string
        end)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + memprefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test("[test-suite] api: testing some auxlib functions", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function gsub (a, b, c)
          a, b = T.testC("gsub 2 3 4; gettop; return 2", a, b, c)
          assert(b == 5)
          return a
        end

        assert(gsub("alo.alo.uhuh.", ".", "//") == "alo//alo//uhuh//")
        assert(gsub("alo.alo.uhuh.", "alo", "//") == "//.//.uhuh.")
        assert(gsub("", "alo", "//") == "")
        assert(gsub("...", ".", "/.") == "/././.")
        assert(gsub("...", "...", "") == "")
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
