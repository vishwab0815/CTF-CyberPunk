declare module '*.css';
declare module '*.scss';
declare module '*.png';
declare module '*.jpg';
declare module '*.svg' {
  const content: any;
  export default content;
}

// (Do not declare glob module names.) Absolute imports are handled by
// `tsconfig.json` paths; the above asset declarations are sufficient.
