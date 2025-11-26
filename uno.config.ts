import { defineConfig, presetAttributify, presetIcons, presetMini } from 'unocss'

export default defineConfig({
  presets: [
    presetAttributify(),
    presetIcons(),
    presetMini(),
  ],
})
