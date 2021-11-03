<template>
    <div class="captains_mode">
        <div class="pick__view">
            <div class="picks">
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
                        @click="forceChoose(index, true)"
                        :class="{
                            stage_ban: item.stage === 'ban',
                            stage_pick: item.stage === 'pick',
                            active: active(index, true),
                            clickable: clickable(index, true),
                            changeable: changeable(index, true),
                        }"
                    >
                        <img
                            v-if="order[index].radiant"
                            :src="order[index].radiant.img"
                        />
                    </div>
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
                        @click="forceChoose(index, false)"
                        :class="{
                            stage_ban: item.stage === 'ban',
                            stage_pick: item.stage === 'pick',
                            active: active(index, false),
                            clickable: clickable(index, false),
                            changeable: changeable(index, false),
                        }"
                    >
                        <img
                            v-if="order[index].dire"
                            :src="order[index].dire.img"
                        />
                    </div>
                </div>
            </div>
            <div class="button-block">
                <button
                    class="default-btn"
                    @click="calculate()"
                    :disabled="in_progess"
                    :class="{ disabled: in_progess }"
                >
                    ALL
                </button>
                <button
                    class="default-btn"
                    @click="calculate(true)"
                    :disabled="in_progess"
                    :class="{ disabled: in_progess }"
                >
                    NEXT
                </button>
                <div class="icon-block">
                    <div
                        class="mdi mdi-delete"
                        @click="reset()"
                        :disabled="in_progess"
                        :class="{ disabled: in_progess }"
                    ></div>
                    <div
                        class="mdi"
                        :class="{
                            'mdi-check-circle': use_bad,
                            'mdi-checkbox-blank-circle': !use_bad,
                            disabled: in_progess,
                        }"
                        @click="toggleBad()"
                    ></div>
                </div>
            </div>
            <div v-if="other_heroes" class="other_heroes">
                <img
                    v-for="id in other_heroes"
                    :key="id"
                    :src="heroes[id].img"
                    @click="changeLastPick(id)"
                />
            </div>
        </div>
        <div
            class="heroes__view"
            :class="{ active: current_step < 24 && !in_progess }"
        >
            <div class="heroes-view">
                <div class="heroes-subview str-heroes">
                    <img
                        :src="hero.img"
                        :key="hero.id"
                        :class="{
                            disabled: disabled[hero.id] || in_progess,
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
                            disabled: disabled[hero.id] || in_progess,
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
                            disabled: disabled[hero.id] || in_progess,
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
            winrate: undefined,
            current_step: 0,
            steps: [
                [true, 0], // начало банов
                [false, 0],
                [true, 1],
                [false, 1], // конец банов
                [true, 2], // начало пиков
                [false, 2],
                [false, 3],
                [true, 3], // конец пиков
                [true, 4], // начало банов
                [false, 4],
                [true, 5],
                [false, 5],
                [true, 6],
                [false, 6], // конец банов
                [false, 7],
                [true, 7],
                [false, 8],
                [true, 8],
                [false, 9],
                [true, 9],
                [false, 10],
                [true, 10],
                [false, 11],
                [true, 11],
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
            in_progess: false,
        };
    },
    computed: {
        active_step() {
            return this.steps[this.current_step] || [];
        },
    },
    watch: {
        async current_step(value) {
            if (!this.in_progess) {
                this.other_heroes = undefined;
            }
            if (value === 24) {
                this.in_progess = true;
                this.winrate = await getPickWinrate(
                    this.order
                        .filter(({ stage }) => stage === "pick")
                        .map(({ radiant }) => radiant.id),
                    this.order
                        .filter(({ stage }) => stage === "pick")
                        .map(({ dire }) => dire.id)
                );
                this.in_progess = false;
            }
        },
    },
    methods: {
        clickable(index, is_radiant) {
            return (
                this.current_step >
                this.steps.findIndex(
                    (item) => item[0] === is_radiant && item[1] === index
                )
            );
        },
        active(index, is_radiant) {
            return (
                this.active_step[0] === is_radiant &&
                this.active_step[1] === index
            );
        },
        changeable(index, is_radiant) {
            return (
                this.other_heroes &&
                this.steps[this.current_step - 1] &&
                this.steps[this.current_step - 1][0] === is_radiant &&
                this.steps[this.current_step - 1][1] === index
            );
        },
        forceChoose(index, is_radiant) {
            if (this.in_progess || !this.clickable(index, is_radiant)) {
                return;
            }
            this.winrate = undefined;
            this.current_step = this.steps.findIndex(
                (item) => item[0] === is_radiant && item[1] === index
            );
            for (let i = this.current_step; i < this.steps.length; i++) {
                const [is_radiant, index] = this.steps[i];
                const step = this.order[index];
                if (step[toKey(is_radiant)]) {
                    this.disabled[step[toKey(is_radiant)].id] = false;
                }
                step[toKey(is_radiant)] = undefined;
            }
        },
        changeLastPick(id) {
            if (this.in_progess) {
                return;
            }
            this.current_step -= 1;
            this.other_heroes = undefined;
            this.selectHero(this.heroes[id]);
        },
        selectHero(hero, force) {
            if (
                this.disabled[hero.id] ||
                (!force && this.in_progess) ||
                this.current_step > 23
            ) {
                return;
            }
            const [is_radiant, index] = this.steps[this.current_step];
            this.disabled[hero.id] = true;
            if (this.order[index][toKey(is_radiant)]) {
                this.disabled[this.order[index][toKey(is_radiant)].id] = false;
            }
            this.order[index][toKey(is_radiant)] = hero;
            this.current_step += 1;
        },
        async calculate(once) {
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

            this.other_heroes = undefined;
            this.in_progess = true;

            const generator = computeAllPicks(
                radiant_array.map(String),
                dire_array.map(String),
                bans_array.map(String),
                this.current_step,
                this.use_bad,
                this.heroes,
                once ? 4 : 1
            );

            for await (const ids of generator) {
                const best_id = ids[0];
                this.selectHero(this.heroes[best_id], true);
                if (once) {
                    this.other_heroes = ids.slice(1);
                    break;
                }
            }

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