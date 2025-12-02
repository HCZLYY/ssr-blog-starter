self.__BUILD_MANIFEST = {
  "/": [
    "static/chunks/pages/index.js"
  ],
  "/articles/[id]": [
    "static/chunks/pages/articles/[id].js"
  ],
  "__rewrites": {
    "afterFiles": [],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/",
    "/_app",
    "/_error",
    "/articles/[id]"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()