import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    'next-env.d.ts',
  ],
  nextjs: true,
  react: true,
  typescript: true,
})
