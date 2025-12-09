module.exports = [
"[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react/jsx-dev-runtime", () => require("react/jsx-dev-runtime"));

module.exports = mod;
}),
"[project]/web/pages/index.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// web/pages/index.js
__turbopack_context__.s([
    "default",
    ()=>Home,
    "getServerSideProps",
    ()=>getServerSideProps
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/node_modules/next/link.js [ssr] (ecmascript)");
;
;
;
function Home({ ssrArticles = [], ssrDegraded = false }) {
    const [articles, setArticles] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(ssrArticles);
    const [degraded, setDegraded] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(ssrDegraded);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (degraded && articles.length === 0) {
            // try client fetch to recover
            (async ()=>{
                setLoading(true);
                try {
                    const r = await fetch(`/api/v1/articles?page=1&limit=10`);
                    if (r.ok) {
                        const data = await r.json();
                        if (data && data.value) setArticles(data.value);
                        setDegraded(false);
                    }
                } catch (e) {
                // still degraded
                } finally{
                    setLoading(false);
                }
            })();
        }
    }, [
        degraded,
        articles.length
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        style: {
            padding: 24
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                children: "文章列表"
            }, void 0, false, {
                fileName: "[project]/web/pages/index.js",
                lineNumber: 33,
                columnNumber: 13
            }, this),
            degraded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    color: 'orange'
                },
                children: "服务器负载/数据不可用，已降级 — 正在尝试恢复..."
            }, void 0, false, {
                fileName: "[project]/web/pages/index.js",
                lineNumber: 34,
                columnNumber: 26
            }, this),
            loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                children: "加载中..."
            }, void 0, false, {
                fileName: "[project]/web/pages/index.js",
                lineNumber: 35,
                columnNumber: 25
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("ul", {
                children: articles.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                    children: "暂无文章"
                }, void 0, false, {
                    fileName: "[project]/web/pages/index.js",
                    lineNumber: 38,
                    columnNumber: 21
                }, this) : articles.map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                        style: {
                            marginBottom: 12
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$web$2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    href: `/articles/${a.id}`,
                                    legacyBehavior: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("a", {
                                        children: a.title
                                    }, void 0, false, {
                                        fileName: "[project]/web/pages/index.js",
                                        lineNumber: 42,
                                        columnNumber: 81
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/web/pages/index.js",
                                    lineNumber: 42,
                                    columnNumber: 33
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/web/pages/index.js",
                                lineNumber: 42,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                children: a.summary
                            }, void 0, false, {
                                fileName: "[project]/web/pages/index.js",
                                lineNumber: 43,
                                columnNumber: 29
                            }, this)
                        ]
                    }, a.id, true, {
                        fileName: "[project]/web/pages/index.js",
                        lineNumber: 41,
                        columnNumber: 25
                    }, this))
            }, void 0, false, {
                fileName: "[project]/web/pages/index.js",
                lineNumber: 36,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/web/pages/index.js",
        lineNumber: 32,
        columnNumber: 9
    }, this);
}
async function getServerSideProps(ctx) {
    const API = ("TURBOPACK compile-time value", "http://localhost:3000") || 'http://localhost:3000';
    try {
        const controller = new AbortController();
        const t = setTimeout(()=>controller.abort(), 1800);
        const res = await fetch(`${API}/api/v1/articles?page=1&limit=10`, {
            signal: controller.signal
        });
        clearTimeout(t);
        if (!res.ok) throw new Error('api not ok');
        const data = await res.json();
        return {
            props: {
                ssrArticles: data.value || [],
                ssrDegraded: !!data.degraded
            }
        };
    } catch (e) {
        // return skeleton (降级)
        return {
            props: {
                ssrArticles: [],
                ssrDegraded: true
            }
        };
    }
}
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8ac13d0f._.js.map