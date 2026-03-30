// FIXED VERSION - 2 slechtste SPRINTS worden verwijderd

function buildSeasonRows(races) {
  const allDrivers = {};

  races.forEach(race => {
    (race.results || []).forEach(result => {
      const key = result.driver.toLowerCase();

      if (!allDrivers[key]) {
        allDrivers[key] = {
          driver: result.driver,
          bestSprint: 999,
          sprintPoints: []
        };
      }

      allDrivers[key].sprintPoints.push(
        Number(result.sprint1Points || 0),
        Number(result.sprint2Points || 0)
      );

      allDrivers[key].bestSprint = Math.min(
        allDrivers[key].bestSprint,
        Number(result.bestSprint || 999)
      );
    });
  });

  return Object.values(allDrivers).map(driver => {
    const sorted = [...driver.sprintPoints].sort((a, b) => a - b);

    const dropped = sorted.slice(0, 2);
    const counted = sorted.slice(2);

    const totalPoints = counted.reduce((sum, p) => sum + p, 0);

    return {
      driver: driver.driver,
      points: totalPoints,
      races: driver.sprintPoints.length / 2,
      droppedRaces: dropped.join(" + "),
      bestSprint: driver.bestSprint
    };
  }).sort((a, b) =>
    b.points - a.points ||
    a.bestSprint - b.bestSprint ||
    a.driver.localeCompare(b.driver, "nl")
  );
}
