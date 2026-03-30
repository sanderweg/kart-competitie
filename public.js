function buildSeasonRows(races){
  const drivers={};

  races.forEach(r=>{
    (r.results||[]).forEach(res=>{
      const key=res.driver.toLowerCase();
      if(!drivers[key]){
        drivers[key]={driver:res.driver,sprints:[]};
      }
      drivers[key].sprints.push(res.sprint1Points||0,res.sprint2Points||0);
    });
  });

  return Object.values(drivers).map(d=>{
    const sorted=[...d.sprints].sort((a,b)=>a-b);
    const dropped=sorted.slice(0,2);
    const total=sorted.slice(2).reduce((a,b)=>a+b,0);

    return {driver:d.driver,points:total,dropped:dropped.join(" + ")};
  }).sort((a,b)=>b.points-a.points);
}
console.log("Leaderboard loaded");
