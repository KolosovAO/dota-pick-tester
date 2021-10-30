<template>
    <div id="app">
        <div class="app-header">
            <img class="logo" src="../static/medvebet.png" />
            <div class="header-text">MEDVEBOT</div>
            <div class="live-circle" @click="toggleMode('live')"></div>
            <div class="aegis" @click="toggleMode('captains_mode')">
                <img src="../static/aegis.png" />
            </div>
            <div class="team-finder" v-if="mode === 'live'">
                <input
                    type="text"
                    @keyup.enter="getTeamInfo"
                    v-model="team_input_value"
                />
                <div @click="getTeamInfo" class="mdi mdi-magnify"></div>
                <div class="team-finder__suggested_team">
                    {{ suggested_team && suggested_team.name }}
                </div>
                <div
                    @click="clear"
                    v-if="team_info"
                    class="mdi mdi-backspace"
                ></div>
                <loading v-if="team_info_in_progress" />
            </div>
        </div>
        <div class="app-body">
            <div class="app-content">
                <picker
                    v-if="!mode"
                    :teams="teams"
                    :heroes="heroes"
                    :agiHeroes="agiHeroes"
                    :strHeroes="strHeroes"
                    :intHeroes="intHeroes"
                    :forced_match="forced_match"
                />
                <live
                    v-if="mode === 'live' && !team_info"
                    :heroes="heroes"
                    :teams="teams"
                    :copyMatch="copyMatch"
                />
                <teaminfo
                    v-if="mode === 'live' && team_info"
                    :heroes="heroes"
                    :team_info="team_info"
                    single
                />
                <captainsmode
                    v-if="mode === 'captains_mode'"
                    :heroes="heroes"
                    :agiHeroes="agiHeroes"
                    :strHeroes="strHeroes"
                    :intHeroes="intHeroes"
                />
            </div>
        </div>
        <error v-if="error" :message="error"></error>
    </div>
</template>

<script>
import "./styles/index.scss";

import PickHelper from "./components/PickHelper";
import ErrorMessage from "./components/Error";
import Live from "./components/Live";
import TeamInfo from "./components/TeamInfo";
import Loading from "./components/Loading";
import { getURL } from "./urls";
import {
    fuzzySearch,
    getTeamHeroesWinrate,
    getTeamInfo,
    getTeamLastMatches,
} from "./helper";
import heroes_roles from "./heroes_roles";
import CaptainsMode from "./components/CaptainsMode.vue";

export default {
    name: "App",
    components: {
        picker: PickHelper,
        error: ErrorMessage,
        live: Live,
        teaminfo: TeamInfo,
        loading: Loading,
        captainsmode: CaptainsMode,
    },
    data() {
        return {
            heroes: {},
            teams: {},
            mode: undefined, // "live" | "captains_mode"
            error: "",
            agiHeroes: [],
            strHeroes: [],
            intHeroes: [],
            forced_match: undefined,
            team_input_value: "",
            suggested_team: undefined,
            team_info: undefined,
            team_info_in_progress: false,
        };
    },
    watch: {
        team_input_value(value) {
            if (!value) {
                this.suggested_team = undefined;
            } else {
                const suggested_teams = Object.values(this.teams).filter(
                    (team) =>
                        fuzzySearch(
                            team.name.toLowerCase(),
                            value.toLowerCase()
                        )
                );
                let letters_count = Infinity;
                let suggested_team = undefined;
                for (const team of suggested_teams) {
                    if (team.name.length < letters_count) {
                        letters_count = team.name.length;
                        suggested_team = team;
                    }
                }
                this.suggested_team = suggested_team;
            }
        },
    },
    methods: {
        toggleMode(mode) {
            if (this.mode === mode) {
                this.mode = undefined;
            } else {
                this.mode = mode;
            }
        },
        copyMatch(match) {
            const teams_to_update = [];
            if (!this.teams[match.team_id_radiant]) {
                teams_to_update.push(match.team_id_radiant);
            }
            if (!this.teams[match.team_id_dire]) {
                teams_to_update.push(match.team_id_dire);
            }
            Promise.all(teams_to_update.map(getTeamInfo)).then((teams) => {
                teams.forEach((team) => {
                    this.teams[team.team_id] = team;
                });
                this.mode = undefined;
                this.forced_match = match;
            });
        },
        getTeamInfo() {
            if (this.suggested_team) {
                this.team_info_in_progress = true;
                Promise.all([
                    getTeamHeroesWinrate(
                        this.suggested_team.team_id,
                        Object.values(this.heroes).map(({ id }) => id)
                    ),
                    getTeamLastMatches(this.suggested_team.team_id),
                ]).then(([heroes_info, last_matches]) => {
                    this.team_info_in_progress = false;
                    this.team_info = {
                        team: this.suggested_team,
                        heroes_info,
                        last_matches,
                    };
                });
            }
        },
        clear() {
            this.team_input_value = "";
            this.team_info = undefined;
            this.suggested_team = undefined;
        },
    },
    beforeMount() {
        fetch(getURL.heroStats())
            .then((res) => res.json())
            .then((data) => {
                const str = [];
                const agi = [];
                const int = [];
                const heroes = {};
                for (const hero of data) {
                    heroes[hero.id] = {
                        id: hero.id,
                        attr: hero.primary_attr,
                        icon: "./static/heroes/" + hero.id + ".png",
                        img: "./static/heroes/" + hero.id + "full.png",
                        name: hero.name,
                        local: hero.localized_name || "new",
                        $markedAlly: false,
                        $markedEnemy: false,
                        $filtered: true,
                        divine_wr: hero["8_win"] / hero["8_pick"],
                        divine_count: hero["8_pick"],
                        pro_count: hero.pro_pick,
                        pro_wr: hero.pro_win / hero.pro_pick,
                        roles: heroes_roles[hero.id],
                    };
                    switch (hero.primary_attr) {
                        case "agi":
                            agi.push(heroes[hero.id]);
                            break;
                        case "str":
                            str.push(heroes[hero.id]);
                            break;
                        case "int":
                            int.push(heroes[hero.id]);
                            break;
                    }
                }
                const sortRule = (a, b) => a.local.localeCompare(b.local);
                str.sort(sortRule);
                int.sort(sortRule);
                agi.sort(sortRule);
                this.agiHeroes = agi;
                this.strHeroes = str;
                this.intHeroes = int;
                this.heroes = heroes;
            });

        fetch(getURL.teams())
            .then((res) => res.json())
            .then((result) => {
                const teams = {};
                for (const team of result) {
                    teams[team.team_id] = {
                        team_id: team.team_id,
                        rating: team.raiting,
                        wins: team.wins,
                        losses: team.loses,
                        last_match_time: team.last_match_time,
                        name: team.name,
                        tag: team.tag,
                        logo_url: team.logo_url,
                    };
                }

                this.teams = teams;
            });

        this.$root.$on("error", (msg) => {
            this.error = msg;
            setTimeout(() => {
                if (this.error === msg) {
                    this.error = "";
                }
            }, 5000);
        });
    },
};
</script>
