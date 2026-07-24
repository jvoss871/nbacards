const ESPN_ID: Record<string, string> = {
  ATL: 'atl', BOS: 'bos', BKN: 'bkn', CHA: 'cha', CHI: 'chi',
  CLE: 'cle', DAL: 'dal', DEN: 'den', DET: 'det', GSW: 'gs',
  HOU: 'hou', IND: 'ind', LAC: 'lac', LAL: 'lal', MEM: 'mem',
  MIA: 'mia', MIL: 'mil', MIN: 'min', NOP: 'no',  NYK: 'ny',
  OKC: 'okc', ORL: 'orl', PHI: 'phi', PHX: 'phx', POR: 'por',
  SAC: 'sac', SAS: 'sa',  TOR: 'tor', UTA: 'utah', WAS: 'wsh',
}

export function teamLogoUrl(abbr: string): string {
  const id = ESPN_ID[abbr] ?? abbr.toLowerCase()
  return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/${id}.png&h=80&w=80`
}
