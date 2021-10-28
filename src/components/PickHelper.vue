<template>
  <div class="pick-helper">
    <div class="heroes-container">
      <finder :v-if="heroFilter" :filter="heroFilter"></finder>
      <div class="heroes-view">
        <div class="heroes-subview str-heroes">
          <img
            :src="hero.icon"
            :key="hero.id"
            @contextmenu="heroClick($event, hero)"
            @click="heroClick($event, hero)"
            @mouseover="heroOver(hero)"
            @mouseout="heroOut(hero)"
            :class="{
              ally_selected: hero.$markedAlly,
              enemy_selected: hero.$markedEnemy,
              filtered: !hero.$filtered,
            }"
            v-for="hero in strHeroes"
          />
        </div>
        <div class="heroes-subview agi-heroes">
          <img
            :src="hero.icon"
            :key="hero.id"
            @contextmenu="heroClick($event, hero)"
            @click="heroClick($event, hero)"
            @mouseover="heroOver(hero)"
            @mouseout="heroOut(hero)"
            :class="{
              ally_selected: hero.$markedAlly,
              enemy_selected: hero.$markedEnemy,
              filtered: !hero.$filtered,
            }"
            v-for="hero in agiHeroes"
          />
        </div>
        <div class="heroes-subview int-heroes">
          <img
            :src="hero.icon"
            :key="hero.id"
            @contextmenu="heroClick($event, hero)"
            @click="heroClick($event, hero)"
            @mouseover="heroOver(hero)"
            @mouseout="heroOut(hero)"
            :class="{
              ally_selected: hero.$markedAlly,
              enemy_selected: hero.$markedEnemy,
              filtered: !hero.$filtered,
            }"
            v-for="hero in intHeroes"
          />
        </div>
      </div>
    </div>
    <div class="calculations">
      <div class="calc-block picks">
        <div
          class="team__top"
          v-if="
            !ignore_forced_match &&
            forced_match &&
            teams[forced_match.team_id_radiant]
          "
        >
          <div class="team__logo">
            <img :src="teams[forced_match.team_id_radiant].logo_url" />
          </div>
          <div class="team__name">
            {{ teams[forced_match.team_id_radiant].name }}
          </div>
        </div>
        <div class="info-block">
          <img v-for="id in ally" :src="heroes[id].icon" :key="id" />
        </div>
        <div class="find-controller">
          <div class="toggler">
            <div
              class="mdi mdi-arrow-up-bold"
              :class="{ active: showBest1 }"
              @click="toggle(true, true)"
            ></div>
            <div
              class="mdi mdi-arrow-down-bold"
              :class="{ active: !showBest1 }"
              @click="toggle(true, false)"
            ></div>
          </div>
          <button class="default-btn" @click="findBest(false)">Find</button>
          <div class="mdi mdi-delete clear-heroes" @click="clearAlly"></div>
        </div>
        <div v-if="bestVsTeam1.length">
          <loading v-if="wait.vsAlly"></loading>
          <div class="calc-result" v-for="hero in team1Heroes" :key="hero.id">
            <img :src="heroes[hero.id].icon" />
            <div>{{ hero.winrate }} {{ hero.bad ? "*" : "" }}</div>
          </div>
        </div>
      </div>
      <div class="calc-block picks">
        <div
          class="team__top"
          v-if="
            !ignore_forced_match &&
            forced_match &&
            teams[forced_match.team_id_dire]
          "
        >
          <div class="team__logo">
            <img :src="teams[forced_match.team_id_dire].logo_url" />
          </div>
          <div class="team__name">
            {{ teams[forced_match.team_id_dire].name }}
          </div>
        </div>
        <div class="info-block">
          <img v-for="id in enemy" :src="heroes[id].icon" :key="id" />
        </div>
        <div class="find-controller">
          <div class="toggler">
            <div
              class="mdi mdi-arrow-up-bold"
              :class="{ active: showBest2 }"
              @click="toggle(false, true)"
            ></div>
            <div
              class="mdi mdi-arrow-down-bold"
              :class="{ active: !showBest2 }"
              @click="toggle(false, false)"
            ></div>
          </div>
          <button class="default-btn" @click="findBest(true)">Find</button>
          <div class="mdi mdi-delete clear-heroes" @click="clearEnemy"></div>
        </div>
        <div v-if="bestVsTeam2.length">
          <loading v-if="wait.vsEnemy"></loading>
          <div class="calc-result" v-for="hero in team2Heroes" :key="hero.id">
            <img :src="heroes[hero.id].icon" />
            <div>{{ hero.winrate }} {{ hero.bad ? "*" : "" }}</div>
          </div>
        </div>
      </div>
      <div class="calc-block winrate">
        <div
          class="info-block team-winrate"
          :class="{ positive: parseInt(winrate) >= 50, empty: !winrate }"
        >
          <loading v-if="wait.winrate"></loading>
          {{ winrate || "" }}
        </div>
        <button class="default-btn" @click="getWinrate">
          Calculate
          <span class="mdi mdi-calculator"></span>
        </button>
      </div>
    </div>
    <div v-if="mouseOverHero" class="hero-info">
      <div class="hero-info__row">
        pro games winrate:
        <span
          :class="{
            good_wr: mouseOverHero.pro_wr >= 0.5,
            bad_wr: mouseOverHero.pro_wr < 0.5,
          }"
          >{{
            (Number.isNaN(mouseOverHero.pro_wr)
              ? 0
              : mouseOverHero.pro_wr * 100
            ).toFixed(2)
          }}%</span
        >
        | games count: {{ mouseOverHero.pro_count }}
      </div>
      <div class="hero-info__row">
        divine+ games winrate:
        <span
          :class="{
            good_wr: mouseOverHero.divine_wr >= 0.5,
            bad_wr: mouseOverHero.divine_wr < 0.5,
          }"
          >{{ (mouseOverHero.divine_wr * 100).toFixed(2) }}%</span
        >
        | games count: {{ mouseOverHero.divine_count }}
      </div>
      <div class="hero-info__row">
        roles: {{ mouseOverHero.roles.join(", ") }}
      </div>
    </div>
  </div>
</template>

<script>
import {
  getPickWinrate,
  findBestHeroes,
  fuzzySearch,
  computeAllHeroes,
} from "./../helper";
import Finder from "./Finder";
import Loading from "./Loading";

export default {
  name: "Pickhelper",
  components: {
    finder: Finder,
    loading: Loading,
  },
  props: {
    heroes: Object,
    teams: Object,
    agiHeroes: Array,
    strHeroes: Array,
    intHeroes: Array,
    forced_match: Object,
  },
  data() {
    return {
      mouseOverHero: undefined,
      enemy: [],
      ally: [],
      bestVsTeam1: [],
      showBest1: true,
      showBest2: true,
      bestVsTeam2: [],
      worstVsTeam1: [],
      worstVsTeam2: [],
      winrate: "",
      heroFilter: "",
      keydownListener: null,
      wait: {
        vsEnemy: false,
        vsAlly: false,
        winrate: false,
      },
      ignore_forced_match: true,
    };
  },
  beforeMount() {
    for (const hero_id in this.heroes) {
      const hero = this.heroes[hero_id];
      if (hero.$markedEnemy) {
        this.balanceArray(hero, true);
      } else if (hero.$markedAlly) {
        this.balanceArray(hero, false);
      }
    }

    let timeout = null;
    this.keydownListener = (e) => {
      if (e.shiftKey || e.altKey || e.ctrlKey) {
        return;
      }
      if (e.keyCode >= 65 && e.keyCode <= 90) {
        this.heroFilter += e.key;
      }
      if (e.keyCode === 8 && this.heroFilter.length) {
        this.heroFilter = this.heroFilter.slice(0, -1);
      }
      if (e.keyCode === 27) {
        this.heroFilter = "";
      }
      for (const key in this.heroes) {
        this.heroes[key].$filtered = fuzzySearch(
          this.heroes[key].local.toLowerCase(),
          this.heroFilter
        );
      }

      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      timeout = setTimeout(() => {
        timeout = null;
        this.heroFilter = "";
        for (const key in this.heroes) {
          this.heroes[key].$filtered = true;
        }
      }, 2500);
    };
    document.addEventListener("keydown", this.keydownListener);
  },
  mounted() {
    if (!this.forced_match) {
      return;
    }
    this.ignore_forced_match = false;
    const { radiant_heroes, dire_heroes } = this.forced_match;
    radiant_heroes.forEach((hero_id) =>
      this.balanceArray(this.heroes[hero_id], false)
    );
    dire_heroes.forEach((hero_id) =>
      this.balanceArray(this.heroes[hero_id], true)
    );
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this.keydownListener);
  },
  methods: {
    heroOver(hero) {
      this.mouseOverHero = hero;
    },
    heroOut(hero) {
      this.mouseOverHero = undefined;
    },
    heroClick(e, hero) {
      this.ignore_forced_match = true;
      this.bestVsTeam1 = [];
      this.bestVsTeam2 = [];
      this.worstVsTeam1 = [];
      this.worstVsTeam2 = [];
      this.winrate = "";
      if (e.which === 3) {
        e.preventDefault();
        this.balanceArray(hero, true);
      } else {
        this.balanceArray(hero, false);
      }
    },
    findBest(enemy) {
      // [FIX] async await, DRY
      const heroIds = Object.keys(this.heroes);

      if (enemy) {
        const pick = this.enemy;
        if (!pick.length) {
          return;
        }
        this.clearBestVsEnemy();
        this.wait.vsEnemy = true;
        findBestHeroes(pick, heroIds).then((data) => {
          const best = data.slice(0, 15);
          const worst = data.slice(-15);
          this.bestVsTeam2 = best;
          this.worstVsTeam2 = worst;
          this.wait.vsEnemy = false;
        });
      } else {
        const pick = this.ally;
        if (!pick.length) {
          return;
        }
        this.clearBestVsAlly();
        this.wait.vsAlly = true;
        findBestHeroes(pick, heroIds).then((data) => {
          const best = data.slice(0, 15);
          const worst = data.slice(-15);
          this.bestVsTeam1 = best;
          this.worstVsTeam1 = worst;
          this.wait.vsAlly = false;
        });
      }
    },
    toggle(isTeam1, value) {
      if (isTeam1) {
        this.showBest1 = value;
      } else {
        this.showBest2 = value;
      }
    },
    balanceArray(hero, isEnemy) {
      const enemyIndex = this.enemy.indexOf(hero.id);
      if (enemyIndex !== -1) {
        hero.$markedEnemy = false;
        this.enemy.splice(enemyIndex, 1);
        return;
      }
      const allyIndex = this.ally.indexOf(hero.id);
      if (allyIndex !== -1) {
        hero.$markedAlly = false;
        this.ally.splice(allyIndex, 1);
        return;
      }
      const arr = isEnemy ? this.enemy : this.ally;
      const [field, other] = isEnemy
        ? ["$markedEnemy", "$markedAlly"]
        : ["$markedAlly", "$markedEnemy"];
      if (arr.length === 5) {
        const first = arr.shift();
        this.heroes[first][field] = false;
      }
      hero[field] = true;
      hero[other] = false;

      arr.push(hero.id);
    },
    async getWinrate() {
      if (this.ally.length !== 5 || this.enemy.length !== 5) {
        this.$root.$emit("error", "all 10 heroes required");
        return;
      }
      this.wait.winrate = true;
      this.winrate = "";
      const winrate = await getPickWinrate(this.ally, this.enemy);
      this.wait.winrate = false;

      this.winrate = winrate;
    },
    clearEnemy() {
      this.ignore_forced_match = true;
      this.enemy.forEach((id) => {
        this.heroes[id].$markedEnemy = false;
      });
      this.enemy = [];
      this.clearBestVsEnemy();
    },
    clearAlly() {
      this.ignore_forced_match = true;
      this.ally.forEach((id) => {
        this.heroes[id].$markedAlly = false;
      });
      this.ally = [];
      this.clearBestVsAlly();
    },
    clearBestVsAlly() {
      this.bestVsTeam1 = [];
      this.worstVsTeam1 = [];
    },
    clearBestVsEnemy() {
      this.bestVsTeam2 = [];
      this.worstVsTeam2 = [];
    },
  },
  computed: {
    team1Heroes() {
      return this.showBest1 ? this.bestVsTeam1 : this.worstVsTeam1;
    },
    team2Heroes() {
      return this.showBest2 ? this.bestVsTeam2 : this.worstVsTeam2;
    },
  },
};
</script>