<template>
    <div class="captains_mode">
        <div class="pick__view">
            <div class="pick">
                <div
                    class="pick__header"
                    :class="{
                        positive: parseFloat(winrate) >= 50,
                        empty: !winrate,
                    }"
                >
                    {{ winrate ? winrate : "" }}
                </div>
                <div
                    v-for="(item, index) in order"
                    :key="index"
                    @click="choose(index, true)"
                    :class="{
                        stage_ban: item.stage === 'ban',
                        stage_pick: item.stage === 'pick',
                        active:
                            choose_hero.index === index &&
                            choose_hero.is_radiant,
                        clickable:
                            index === 0 ||
                            order[index].radiant ||
                            order[index - 1].radiant,
                    }"
                >
                    <img
                        v-if="order[index].radiant"
                        :src="order[index].radiant.img"
                    />
                </div>
                <button
                    class="default-btn"
                    @click="calculate()"
                    :disabled="in_progess"
                    :class="{ disabled: in_progess }"
                >
                    CALCULATE
                </button>
                <div
                    class="bad-toggler mdi"
                    :class="{
                        'mdi-check-circle': use_bad,
                        'mdi-checkbox-blank-circle': !use_bad,
                    }"
                    @click="toggleBad()"
                ></div>
            </div>
            <div class="pick">
                <div
                    class="pick__header"
                    :class="{
                        positive: parseFloat(winrate) < 50,
                        empty: !winrate,
                    }"
                >
                    {{ winrate ? 100 - parseFloat(winrate) : "" }}
                </div>
                <div
                    v-for="(item, index) in order"
                    :key="index"
                    @click="choose(index, false)"
                    :class="{
                        stage_ban: item.stage === 'ban',
                        stage_pick: item.stage === 'pick',
                        active:
                            choose_hero.index === index &&
                            !choose_hero.is_radiant,
                        clickable:
                            index === 0 ||
                            order[index].dire ||
                            order[index - 1].dire,
                    }"
                >
                    <img
                        v-if="order[index].dire"
                        :src="order[index].dire.img"
                    />
                </div>
                <button
                    class="default-btn"
                    @click="reset()"
                    :disabled="in_progess"
                    :class="{ disabled: in_progess }"
                >
                    RESET
                </button>
            </div>
        </div>
        <div class="heroes__view" :class="{ active: choose_hero.index !== -1 }">
            <div class="heroes-view">
                <div class="heroes-subview str-heroes">
                    <img
                        :src="hero.img"
                        :key="hero.id"
                        :class="{
                            disabled: disabled[hero.id],
                        }"
                        v-for="hero in strHeroes"
                        @click="selectHero(hero)"
                    />
                </div>
                <div class="heroes-subview agi-heroes">
                    <img
                        :src="hero.img"
                        :key="hero.id"
                        :class="{
                            disabled: disabled[hero.id],
                        }"
                        v-for="hero in agiHeroes"
                        @click="selectHero(hero)"
                    />
                </div>
                <div class="heroes-subview int-heroes">
                    <img
                        :src="hero.img"
                        :key="hero.id"
                        :class="{
                            disabled: disabled[hero.id],
                        }"
                        v-for="hero in intHeroes"
                        @click="selectHero(hero)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { computeAllPicks, getPickWinrate } from "../helper";
const toKey = (is_radiant) => (is_radiant ? "radiant" : "dire");

export default {
    name: "CaptainsMode",
    props: {
        heroes: Object,
        strHeroes: Object,
        agiHeroes: Object,
        intHeroes: Object,
    },
    data() {
        return {
            use_bad: false,
            disabled: {},
            current_step: 0,
            winrate: undefined,
            steps: [
                true, // начало банов
                false,
                true,
                false, // конец банов
                true, // начало пиков
                false,
                false,
                true, // конец пиков
                true, // начало банов
                false,
                true,
                false,
                true,
                false, // конец банов
                false,
                true,
                false,
                true,
                false,
                true,
                false,
                true,
                false,
                true,
            ],
            order: [
                { stage: "ban", dire: undefined, radiant: undefined },
                { stage: "ban", dire: undefined, radiant: undefined },
                { stage: "pick", dire: undefined, radiant: undefined },
                { stage: "pick", dire: undefined, radiant: undefined },
                { stage: "ban", dire: undefined, radiant: undefined },
                { stage: "ban", dire: undefined, radiant: undefined },
                { stage: "ban", dire: undefined, radiant: undefined },
                { stage: "pick", dire: undefined, radiant: undefined },
                { stage: "pick", dire: undefined, radiant: undefined },
                { stage: "ban", dire: undefined, radiant: undefined },
                { stage: "ban", dire: undefined, radiant: undefined },
                { stage: "pick", dire: undefined, radiant: undefined },
            ],
            choose_hero: {
                index: 0,
                is_radiant: true,
            },
            in_progess: false,
        };
    },
    methods: {
        choose(index, is_radiant) {
            if (index > 0 && !this.order[index - 1][toKey(is_radiant)]) {
                return;
            }
            this.choose_hero.index = index;
            this.choose_hero.is_radiant = is_radiant;
        },
        selectHero(hero) {
            if (this.disabled[hero.id]) {
                return;
            }
            const { index, is_radiant } = this.choose_hero;
            this.disabled[hero.id] = true;
            if (this.order[index][toKey(is_radiant)]) {
                this.disabled[this.order[index][toKey(is_radiant)].id] = false;
            }
            this.order[index][toKey(is_radiant)] = hero;
            this.nextStep();
        },
        nextStep() {
            this.current_step += 1;
            const is_radiant_next = this.steps[this.current_step];
            this.choose_hero.is_radiant = is_radiant_next;
            this.choose_hero.index = this.order.findIndex(({ radiant, dire }) =>
                is_radiant_next ? !radiant : !dire
            );
        },
        async calculate() {
            if (this.in_progess) {
                return;
            }
            const bans_array = [];
            const dire_array = [];
            const radiant_array = [];

            for (const { stage, dire, radiant } of this.order) {
                if (stage === "ban") {
                    if (dire) {
                        bans_array.push(dire.id);
                    }
                    if (radiant) {
                        bans_array.push(radiant.id);
                    }
                } else {
                    if (dire) {
                        dire_array.push(dire.id);
                    }
                    if (radiant) {
                        radiant_array.push(radiant.id);
                    }
                }
            }

            if (!dire_array.length && !radiant_array.length) {
                return;
            }

            this.in_progess = true;

            const generator = computeAllPicks(
                radiant_array.map(String),
                dire_array.map(String),
                bans_array.map(String),
                this.current_step,
                this.use_bad,
                this.heroes
            );

            let radiant_index = this.order.findIndex((item) => !item.radiant);
            let dire_index = this.order.findIndex((item) => !item.dire);

            for await (const { is_radiant, id } of generator) {
                this.disabled[id] = true;
                if (is_radiant) {
                    this.order[radiant_index].radiant = this.heroes[id];
                    radiant_index++;
                } else {
                    this.order[dire_index].dire = this.heroes[id];
                    dire_index++;
                }
                this.nextStep();
            }

            this.winrate = await getPickWinrate(
                this.order
                    .filter(({ stage }) => stage === "pick")
                    .map(({ radiant }) => radiant.id),
                this.order
                    .filter(({ stage }) => stage === "pick")
                    .map(({ dire }) => dire.id)
            );

            this.in_progess = false;
        },
        reset() {
            if (this.in_progess) {
                return;
            }
            this.order.forEach((step) => {
                step.dire = undefined;
                step.radiant = undefined;
            });
            this.current_step = 0;
            this.choose_hero.index = 0;
            this.choose_hero.is_radiant = true;
            this.winrate = undefined;
            Object.keys(this.heroes).forEach((id) => {
                this.disabled[id] = false;
            });
        },
        toggleBad() {
            this.use_bad = !this.use_bad;
        },
    },
};
</script>