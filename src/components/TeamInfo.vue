<template>
    <div class="team_info">
        <div class="team_info__header">
            <div class="team__logo">
                <img :src="team_info.team.logo_url" />
            </div>
            <div class="team__name">{{ team_info.team.name }}</div>
        </div>
        <div class="team__content" :class="{ is_single: single }">
            <div class="team__heroes">
                <div
                    class="hero__info"
                    v-for="hero in team_info.heroes_info"
                    :key="hero.hero_id"
                >
                    <img :src="heroes[hero.hero_id].icon" />
                    <div>{{ computeHeroInfo(hero) }}</div>
                </div>
            </div>
            <div class="team__matches">
                <div
                    v-for="match in team_info.last_matches"
                    :key="match.match_id"
                    class="team__match"
                    :class="{ match__win: match.win }"
                >
                    vs
                    <div class="team__logo">
                        <img :src="match.opposing_team_logo" />
                    </div>
                    <div class="team__name">{{ match.opposing_team_name }}</div>
                    <div class="duration">
                        {{ (match.duration / 60).toFixed(2) }} min
                    </div>
                    <a
                        :href="`https://www.dotabuff.com/matches/${match.match_id}`"
                        target="_blank"
                        >DB</a
                    >
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "TeamInfo",
    props: {
        heroes: Object,
        team_info: Object,
        single: Boolean,
    },
    methods: {
        computeHeroInfo(hero) {
            return hero.is_empty
                ? "never picked"
                : `${((hero.wins / hero.games_played) * 100).toFixed(
                      2
                  )}% games: ${hero.games_played}`;
        },
    },
};
</script>