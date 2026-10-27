/* Keep assigned slots first without changing saved inventory or team order. */
export function teamFirstRoster(owned=[],team=[]){const available=new Set(owned),selected=team.filter(id=>available.has(id));return [...selected,...owned.filter(id=>!selected.includes(id))];}
