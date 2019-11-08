export function applyMixins(targetClass: any, mixinClasses: any[]) {
  mixinClasses.forEach((mixinClasse) => {
    Object.getOwnPropertyNames(mixinClasse.prototype).forEach((name) => {
      targetClass.prototype[name] = mixinClasse.prototype[name];
    });
  });
}
