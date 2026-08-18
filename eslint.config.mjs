import next from "eslint-config-next"

export default [
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts"] },
  ...next,
  {
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },
]
