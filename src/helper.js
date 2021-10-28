import { getURL } from "./urls";

const MAX_BAD_COUNT = 8;

export async function getMatchups(pick) {
    const matchupsPromises = pick.map(id => fetch(getURL.matchups(id)).then(res => res.json()));

    const matchups = await Promise.all(matchupsPromises);
    return matchups;
}

export async function getPickWinrate(team1, team2, pretty = true) {
    const matchups = await getMatchups(team1);

    const vsTeam2Heroes = matchups.map(matchup =>
        matchup.filter(hero => team2.includes(hero.hero_id))
    );

    let count = 0;
    let badCount = 0;
    for (const matchup of vsTeam2Heroes) {
        if (matchup.length === 0) {
            count += 0.5;
            badCount += 5;
            continue;
        }

        count += matchup.reduce((wr, h) => {
            if (h.games_played < MAX_BAD_COUNT) {
                badCount++;
                wr += 0.5;
            } else {
                wr += h.wins / h.games_played;
            }
            return wr;
        }, 0) / matchup.length;
    }

    const winrate = count * 20;

    if (pretty) {
        return `${winrate.toFixed(4)} ${badCount > 5 ? "*" : ""}`;
    }

    return {
        bad: badCount,
        winrate
    }
}

export async function findBestHeroes(pick, heroIds) {
    const matchups = await getMatchups(pick);

    const winrates = [];

    const calculatedMatchups = matchups.map(matchup => matchup.reduce((o, h) => {
        if (h.games_played > 8) {
            o[h.hero_id] = 1 - h.wins / h.games_played;
        }
        return o;
    }, {}));
    for (const id of heroIds) {
        if (pick.includes(+id)) {
            continue;
        }
        let total = 0;
        let bad = 0;

        for (const matchup of calculatedMatchups) {
            if (!matchup[id]) {
                bad++;
                total += 0.5;
            } else {
                total += matchup[id];
            }
        }

        winrates.push({
            id,
            winrate: (total / pick.length * 100).toFixed(4),
            bad
        });
    }
    winrates.sort((a, b) => b.winrate - a.winrate);
    return winrates;
}

export function fuzzySearch(source, target) {
    var sourceLen = source.length;
    var targetLen = target.length;
    if (targetLen > sourceLen) {
        return false;
    }
    var sourceIndex = 0;
    var targetIndex = 0;
    while (sourceIndex < sourceLen && targetIndex < targetLen) {
        if (source[sourceIndex] === target[targetIndex]) {
            targetIndex++;
        }
        sourceIndex++;
    }
    return targetIndex === targetLen;
}

export async function getLiveProMatches() {
    const res = await fetch(getURL.live());
    const matches = await res.json();

    const getTeamPlayers = (players, team_name) => players.filter((player) => player.team_name === team_name);

    const getHeroInfo = (players, radiant_team_name, dire_team_name) => {
        const radiant_players = getTeamPlayers(players, radiant_team_name);
        if (radiant_players.length === 5) {
            return {
                radiant_heroes: radiant_players.map(({ hero_id }) => hero_id),
                dire_heroes: players.filter((player) => !radiant_players.includes(player)).map(({ hero_id }) => hero_id),
            };
        }
        const dire_players = getTeamPlayers(players, dire_team_name);
        if (dire_players.length === 5) {
            return {
                radiant_heroes: players.filter((player) => !dire_players.includes(player)).map(({ hero_id }) => hero_id),
                dire_heroes: dire_players.map(({ hero_id }) => hero_id),
            };
        }
    }

    return matches
        .filter(({ team_id_radiant, team_id_dire, players }) => team_id_radiant && team_id_dire && players.length === 10)
        .map(({ team_id_radiant, team_id_dire, radiant_score, dire_score, players, match_id, team_name_radiant, team_name_dire }) => ({
            match_id,
            team_id_radiant,
            team_name_dire,
            team_name_radiant,
            team_id_dire,
            radiant_score,
            dire_score,
            ...getHeroInfo(players, team_name_radiant, team_name_dire)
        }))
        .filter(({ dire_heroes, radiant_heroes }) => dire_heroes && radiant_heroes && dire_heroes.length === 5 && radiant_heroes.length === 5);
}

export async function getTeamHeroesWinrate(team_id, heroes_ids) {
    const res = await fetch(getURL.teamHeroes(team_id));
    const heroes = await res.json();

    const result = [];

    for (const hero of heroes) {
        if (heroes_ids.includes(hero.hero_id)) {
            result.push(hero);
        }
    }

    const empty_heroes = [];
    if (result.length !== heroes_ids.length) {
        empty_heroes.push(...heroes_ids.filter((hero) => result.every(({ hero_id }) => hero_id !== hero)).map((hero_id) => ({
            hero_id,
            is_empty: true
        })));
    }

    return result.sort((a, b) => b.wins / b.games_played - a.wins / a.games_played).concat(empty_heroes);
}

export async function getTeamLastMatches(team_id, count = 15) {
    const res = await fetch(getURL.teamMatches(team_id));
    const matches = await res.json();

    return matches.slice(0, count).map(({ match_id, radiant_win, radiant, duration, opposing_team_name, opposing_team_logo }) => ({
        win: (radiant && radiant_win) || (!radiant && !radiant_win),
        match_id,
        duration,
        opposing_team_logo,
        opposing_team_name
    }));
}

export function getTeamInfo(team_id) {
    return fetch(getURL.team(team_id)).then(res => res.json());
}


export async function computeNextBestHero(pick, count, heroIds) {
    const best_heroes = await findBestHeroes(pick, heroIds);
    return best_heroes.slice(0, count).map(({ id }) => id);
}

const QUEUE = [
    // { team: "radiant", phase: "pick", count: 1 },
    { team: "dire", phase: "pick", count: 2 },
    { team: "radiant", phase: "pick", count: 1 },
    { team: "radiant", phase: "ban", count: 3 },
    { team: "dire", phase: "ban", count: 3 },
    { team: "dire", phase: "pick", count: 1 },
    { team: "radiant", phase: "pick", count: 2 },
    { team: "dire", phase: "pick", count: 1 },
    { team: "radiant", phase: "ban", count: 2 },
    { team: "dire", phase: "ban", count: 2 },
    { team: "radiant", phase: "pick", count: 1 },
    { team: "dire", phase: "pick", count: 1 },
];

export async function computeAllHeroes(radiant, dire, ban, heroIds) {
    const nextHeroesIds = () => {
        return heroIds.filter((id) => !dire.includes(id) && !radiant.includes(id) && !ban.includes(id));
    };

    return QUEUE.reduce(
        (prev, { count, phase, team }) => {
            const compute_vs = (team === "radiant" && phase === "pick") || (team === "dire" && phase === "ban")
                ? dire
                : radiant;
            return prev.then(() => computeNextBestHero(compute_vs, count, nextHeroesIds()).then(
                (pick) => {
                    if (phase === "ban") {
                        ban.push(...pick);
                    } else {
                        if (team === "radiant") {
                            radiant.push(...pick);
                        } else {
                            dire.push(...pick);
                        }
                    }
                }
            ))
        },
        Promise.resolve()
    ).then(() => [dire, radiant]);
}

/*
    // TODO
    setTimeout(() => {
      computeAllHeroes(["114"], [], [], Object.keys(this.heroes)).then(
        ([dire, radiant]) => {
          console.log(dire, radiant);
          dire.forEach((id) =>
            this.heroClick(
              { which: 3, preventDefault: () => void 0 },
              this.heroes[id]
            )
          );
          radiant.forEach((id) =>
            this.heroClick({ which: 1 }, this.heroes[id])
          );
        }
      );
    }, 500);
*/

