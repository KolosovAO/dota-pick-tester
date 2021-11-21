import { getURL } from "./urls";
import heroes_roles from "./heroes_roles.json";

const delay = ms => new Promise(res => setTimeout(res, ms));

const retry = request => request()
    .catch(() => delay(5000)
        .then(() => retry(request))
    );

const heroesPlaceholder = () => Object.keys(heroes_roles).map((key) => ({
    hero_id: Number(key),
    games_played: 0,
    wins: 0,
}));

const getHeroesPlaceholder = (id) => heroesPlaceholder().filter(({ hero_id }) => hero_id !== Number(id));

const MAX_BAD_COUNT = 8;

export async function getMatchups(pick) {
    const matchupsPromises = pick.map((id) => retry(() => fetch(getURL.matchups(id)))
        .then(res => res.json())
        .then(data => data.length ? data : getHeroesPlaceholder(id))
    );

    const matchups = await Promise.all(matchupsPromises);
    return matchups;
}

export async function getPickWinrate(team1, team2, pretty = true) {
    const matchups = await getMatchups(team1);

    const vsTeam2Heroes = matchups.map(matchup => {
        const raw = matchup.filter(hero => team2.includes(hero.hero_id));
        if (raw.length !== 5) {
            return team2.map((id) => raw.find(({ hero_id }) => hero_id === Number(id)) || { hero_id: Number(id), games_played: 0, wins: 0 });
        }
        return raw;
    });

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
    [true, false], // начало банов
    [false, false],
    [true, false],
    [false, false], // конец банов
    [true, true], // начало пиков
    [false, true],
    [false, true],
    [true, true], // конец пиков
    [true, false], // начало банов
    [false, false],
    [true, false],
    [false, false],
    [true, false],
    [false, false], // конец банов
    [false, true],
    [true, true],
    [true, true],
    [false, true],
    [true, false],
    [false, false],
    [true, false],
    [false, false],
    [true, true],
    [false, true],
];

const combos = ([head, ...tail], prev = [], result) => {
    if (!head) {
        result.add(prev.sort().join("_"));
        return;
    }

    head.forEach(v => {
        if (prev.includes(v)) {
            return;
        }
        combos(tail, prev.concat(v), result);
    });
};

export async function* computeAllPicks(radiant, dire, ban, round, use_bad, heroes, getRoles, COUNT = 4) {
    let hero_ids = Object.keys(heroes).filter((id) => !dire.includes(id) && !radiant.includes(id) && !ban.includes(id));

    const canPick = (current_roles, next_role) => {
        if (next_role.length === 0) {
            return false;
        }
        if (current_roles.length === 0) {
            return true;
        }
        for (const role of next_role) {
            const roles_to_check = current_roles.map(
                (roles) => roles.filter(r => r !== role)
            );
            if (roles_to_check.some((roles) => roles.length === 0)) {
                continue;
            }
            const set1 = new Set();
            combos(roles_to_check, [], set1);

            const set2 = new Set();
            combos(
                Array.from({ length: current_roles.length }, _ => ["1", "2", "3", "4", "5"].filter(r => r !== role)),
                [],
                set2
            );

            for (const value of set1) {
                if (set2.has(value)) {
                    return true;
                }
            }
        }

        return false;
    };

    while (QUEUE[round]) {
        const [is_radiant, is_pick] = QUEUE[round];

        const best_heroes = await findBestHeroes(
            (is_radiant && is_pick) || (!is_radiant && !is_pick)
                ? dire
                : radiant,
            hero_ids
        );
        const current_pick = (is_radiant && is_pick) || (!is_radiant && !is_pick)
            ? radiant
            : dire;

        let ids = [];
        for (const { id, bad } of best_heroes) {
            if (Boolean(bad) === use_bad && canPick(current_pick.map((id) => getRoles(id, is_radiant, is_pick)), getRoles(id, is_radiant, is_pick))) {
                ids.push(id);
            }
            if (ids.length === COUNT) {
                break;
            }
        }

        if (ids.length === 0) {
            ids = best_heroes
                .filter(({ bad }) => Boolean(bad) === use_bad)
                .slice(0, COUNT)
                .map(({ id }) => id);
        }
        if (ids.length === 0) {
            ids = best_heroes
                .slice(0, COUNT)
                .map(({ id }) => id);
        }

        yield ids;

        if (is_pick) {
            if (is_radiant) {
                radiant.push(ids[0]);
            } else {
                dire.push(ids[0]);
            }
        }

        hero_ids = hero_ids.filter((hero_id) => hero_id !== ids[0]);

        round++;
    }
}

export async function* predictNextBest(heroes, ban, use_bad, getRoles, count) {
    const best_heroes = Object.values(heroes)
        .filter((hero) => !ban.includes(String(hero.id)))
        .sort((a, b) => b.pro_wr - a.pro_wr)
        .map(({ id }) => String(id));

    let total = 5 - ban.length;
    let index = 0;

    while (total) {
        if (total === 1) {
            const h = best_heroes.filter((id) => getRoles(id, true, true).length);
            ban.push(h[index]);
            yield h.slice(index, index + count);
        } else {
            ban.push(best_heroes[index]);
            yield best_heroes.slice(index, index + count);
        }
        index += count;
        total -= 1;

        await delay(200);
    }

    yield* computeAllPicks(
        best_heroes.slice(index, index + 1),
        [],
        ban,
        5,
        use_bad,
        heroes,
        getRoles,
        count
    );
}
