import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import removeConsole from "vite-plugin-remove-console";

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: (configEnv: { mode: string }) => ({
    plugins:
      configEnv.mode === "production"
        ? [removeConsole({ includes: ["log"] }), tailwindcss()]
        : [tailwindcss()],
    build: {
      // 禁用压缩，便于调试
      minify: configEnv.mode === "production",
    },
  }),
  modules: ["@wxt-dev/module-react"],
  manifest: () => {
    return {
      name: "Linus Prompt",
      description: '__MSG_appDescription__',
      default_locale: "en",
      key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1gIStuzmtlJx9myPcEdZVB6fN6HZ4RDB2FNbhhhd1Q8kopHP3uZioJmGAbZch13CNg4nwDLzkT/Iv+SuQ92r6wEYf14rwv0pyLvegLlTWcKvpG+XfJXMl0AT32Gj2tuOoMceEpNRXZzcPf2QTftX4Lm3Kzv3kmeaIzHps1ajkT18iagllKExzmiQVZjCw/t8NYcY5cdjKQRhQqDTDqv5HnVanucEWmDPMb+AlyHOqAYxDurSt/IX1C5TW/khkCU8Fahcnw50ppVgIVKT7OLtSKDDNlqbC4BWIFWu55S5UR/CZNEbyjDtxzLkfVTi8sov7ZOUCTjEvRwjNmwXbo8PZwIDAQAB",
      permissions: ["storage", "contextMenus", "scripting"],
      host_permissions: ["https://aistudio.google.com/*", "https://www.alphaxiv.org/*", "https://alphaxiv.org/*"],
      browser_specific_settings: {
        gecko: {
          id: import.meta.env.WXT_FIREFOX_EXTENSION_ID,
        },
      },
      commands: {
        "open-prompt-selector": {
          suggested_key: {
            default: "Ctrl+Shift+P",
            mac: "Command+Shift+P",
          },
          description: '__MSG_openPromptSelector__',
        },
        "save-selected-prompt": {
          suggested_key: {
            default: "Ctrl+Shift+S",
            mac: "Command+Shift+S",
          },
          description: '__MSG_saveSelectedPrompt__',
        },
      },
    };
  },
});
