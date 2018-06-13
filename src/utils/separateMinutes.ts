export function separateMinutes( allMin: number ): { all: number, hours: number, minutes: number } {
  const hours = Math.floor( allMin / 60 );
  const minutes = allMin - hours * 60;

  return { all: allMin, hours, minutes };
}
