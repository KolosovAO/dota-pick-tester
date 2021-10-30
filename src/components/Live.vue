  <template>
    <div class="live">
        <div class="matches">
            <div v-if="is_empty">NO LIVE GAMES NOW</div>
            <div class="match" v-for="match in matches" :key="match.id">
                <div class="team">
                    <div class="team__logo" v-if="teams[match.team_id_radiant]">
                        <img :src="teams[match.team_id_radiant].logo_url" />
                    </div>
                    <div class="team__name">{{ match.team_name_radiant }}</div>
                    <div class="team__heroes">
                        <img
                            v-for="hero_id in match.radiant_heroes"
                            :key="hero_id"
                            :src="heroes[hero_id] && heroes[hero_id].icon"
                        />
                    </div>
                    <div class="team__score">{{ match.radiant_score }}</div>
                </div>
                <div class="team">
                    <div class="team__score">{{ match.dire_score }}</div>
                    <div class="team__heroes">
                        <img
                            v-for="hero_id in match.dire_heroes"
                            :key="hero_id"
                            :src="heroes[hero_id] && heroes[hero_id].icon"
                        />
                    </div>
                    <div class="team__name">{{ match.team_name_dire }}</div>
                    <div class="team__logo" v-if="teams[match.team_id_dire]">
                        <img :src="teams[match.team_id_dire].logo_url" />
                    </div>
                </div>
                <div class="icons">
                    <div
                        class="mdi mdi-google-analytics"
                        @click="analytic(match)"
                    ></div>
                    <div
                        class="mdi mdi-content-copy"
                        @click="copyMatch(match)"
                    ></div>
                </div>
            </div>
        </div>
        <loading v-if="loading_teams_info"></loading>
        <teaminfo
            v-for="team_info in teams_info"
            :key="team_info.team.team_id"
            :heroes="heroes"
            :team_info="team_info"
        />
    </div>
</template>

<script>
import {
    getLiveProMatches,
    getTeamHeroesWinrate,
    getTeamLastMatches,
    getTeamInfo,
} from "./../helper";
import Loading from "./Loading";
import TeamInfo from "./TeamInfo";

export default {
    name: "Live",
    components: {
        loading: Loading,
        teaminfo: TeamInfo,
    },
    props: {
        heroes: Object,
        teams: Object,
        copyMatch: Function,
    },
    data() {
        return {
            matches: [],
            teams_info: [],
            loading_teams_info: false,
            is_empty: false,
        };
    },
    beforeMount() {
        this.refresh();
    },
    methods: {
        refresh() {
            getLiveProMatches().then((matches) => {
                this.is_empty = !matches.length;
                this.matches = matches;
            });
        },
        analytic(match) {
            this.teams_info = undefined;
            this.loading_teams_info = true;
            Promise.all([
                getTeamHeroesWinrate(
                    match.team_id_radiant,
                    match.radiant_heroes
                ),
                getTeamLastMatches(match.team_id_radiant),
                getTeamHeroesWinrate(match.team_id_dire, match.dire_heroes),
                getTeamLastMatches(match.team_id_dire),
            ]).then(
                ([
                    heroes_info_team_radiant,
                    last_matches_team_radiant,
                    heroes_info_team_dire,
                    last_matches_team_dire,
                ]) => {
                    const teams_to_update = [];
                    if (!this.teams[match.team_id_radiant]) {
                        teams_to_update.push(match.team_id_radiant);
                    }
                    if (!this.teams[match.team_id_dire]) {
                        teams_to_update.push(match.team_id_dire);
                    }

                    Promise.all(teams_to_update.map(getTeamInfo)).then(
                        (teams) => {
                            teams.forEach((team) => {
                                this.teams[team.team_id] = team;
                            });
                            this.teams_info = [
                                {
                                    team: this.teams[match.team_id_radiant],
                                    heroes_info: heroes_info_team_radiant,
                                    last_matches: last_matches_team_radiant,
                                },
                                {
                                    team: this.teams[match.team_id_dire],
                                    heroes_info: heroes_info_team_dire,
                                    last_matches: last_matches_team_dire,
                                },
                            ];
                            this.loading_teams_info = false;
                        }
                    );
                }
            );
        },
    },
};
</script>