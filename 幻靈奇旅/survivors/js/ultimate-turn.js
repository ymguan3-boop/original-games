// One authored spirit ultimate at a time; simulation clock survives checkpoints.
export function ultimateBusy(run){const lock=run.spiritUltimate;if(!lock||lock.until<=run.time)return false;const actor=lock.owner.startsWith('pet:')?run.pets[Number(lock.owner.slice(4))]:run.enemies.find(e=>e.id===lock.owner);return !!actor&&actor.hp>0;}
export function claimUltimate(run,owner,duration){run.spiritUltimate={owner,until:run.time+Math.max(.1,Number(duration)||1)};}
