export const applyMixins = (targetClass: any, mixinClasses: any[]): void => {
  mixinClasses.forEach((mixinClass) => {
    Object.getOwnPropertyNames(mixinClass.prototype).forEach((name) => {
      targetClass.prototype[name] = mixinClass.prototype[name];
    });
  });
};
