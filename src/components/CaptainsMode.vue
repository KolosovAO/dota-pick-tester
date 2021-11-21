<template>
    <div class="captains_mode">
        <finder :v-if="hero_filter" :filter="hero_filter"></finder>
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
                        <div class="custom_pool" v-if="current_step === 0">
                            <label>Custom pool</label>
                            <input v-model="custom_pool" type="checkbox" />
                        </div>
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
                        <div v-if="!order[index].radiant" class="step-number">
                            {{ toStep(index, true) }}
                        </div>
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
                        <div
                            class="first_pick"
                            v-if="current_step === 0 && custom_pool"
                        >
                            <label>First pick</label>
                            <input v-model="first_pick" type="checkbox" />
                        </div>
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
                        <div v-if="!order[index].dire" class="step-number">
                            {{ toStep(index, false) }}
                        </div>
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
                    :class="{ disabled: in_progess || is_edit_mode }"
                >
                    ALL
                </button>
                <button
                    class="default-btn"
                    @click="calculate(true)"
                    :disabled="in_progess"
                    :class="{ disabled: in_progess || is_edit_mode }"
                >
                    NEXT
                </button>
                <div class="icon-block">
                    <div
                        class="mdi mdi-delete"
                        @click="reset()"
                        :disabled="in_progess"
                        :class="{ disabled: in_progess || is_edit_mode }"
                    ></div>
                    <div
                        class="mdi"
                        :class="{
                            'mdi-check-circle': use_bad,
                            'mdi-checkbox-blank-circle': !use_bad,
                            disabled: in_progess || is_edit_mode,
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
            :class="{
                active: current_step < 24 && !in_progess,
                edit_mode: is_edit_mode,
            }"
        >
            <div
                class="heroes-controls"
                :style="current_step > 0 && { visibility: 'hidden' }"
            >
                <div class="mdi mdi-pencil" @click="toggleEditMode()" />
                <div class="mdi mdi-content-save" @click="saveEditMode()" />
                <div class="mdi mdi-close-circle" @click="clearEditMode()" />
                <div class="mdi mdi-download" @click="exportEditMode()" />
                <div class="mdi mdi-upload" @click="importEditMode()" />
            </div>
            <div class="heroes-view">
                <div class="heroes-subview str-heroes">
                    <img
                        :src="hero.img"
                        :key="hero.id"
                        :class="{
                            disabled:
                                disabled[hero.id] ||
                                filtered[hero.id] ||
                                in_progess,
                            pickable:
                                is_edit_mode &&
                                edit_mode_selected_heroes[hero.id],
                        }"
                        v-for="hero in str"
                        @click="selectHero(hero)"
                    />
                </div>
                <div class="heroes-subview agi-heroes">
                    <img
                        :src="hero.img"
                        :key="hero.id"
                        :class="{
                            disabled:
                                disabled[hero.id] ||
                                filtered[hero.id] ||
                                in_progess,
                            pickable:
                                is_edit_mode &&
                                edit_mode_selected_heroes[hero.id],
                        }"
                        v-for="hero in agi"
                        @click="selectHero(hero)"
                    />
                </div>
                <div class="heroes-subview int-heroes">
                    <img
                        :src="hero.img"
                        :key="hero.id"
                        :class="{
                            disabled:
                                disabled[hero.id] ||
                                filtered[hero.id] ||
                                in_progess,
                            pickable:
                                is_edit_mode &&
                                edit_mode_selected_heroes[hero.id],
                        }"
                        v-for="hero in int"
                        @click="selectHero(hero)"
                    />
                </div>
            </div>
            <div
                class="edit_hero_roles"
                v-if="is_edit_mode && edit_mode_selected_hero"
            >
                {{ heroes[edit_mode_selected_hero].local }} roles:
                <div class="roles">
                    <div
                        class="role"
                        @click="updateRole('1')"
                        :class="{
                            selected:
                                edit_mode_selected_heroes[
                                    edit_mode_selected_hero
                                ].includes('1'),
                        }"
                    >
                        1
                    </div>
                    <div
                        class="role"
                        @click="updateRole('2')"
                        :class="{
                            selected:
                                edit_mode_selected_heroes[
                                    edit_mode_selected_hero
                                ].includes('2'),
                        }"
                    >
                        2
                    </div>
                    <div
                        class="role"
                        @click="updateRole('3')"
                        :class="{
                            selected:
                                edit_mode_selected_heroes[
                                    edit_mode_selected_hero
                                ].includes('3'),
                        }"
                    >
                        3
                    </div>
                    <div
                        class="role"
                        @click="updateRole('4')"
                        :class="{
                            selected:
                                edit_mode_selected_heroes[
                                    edit_mode_selected_hero
                                ].includes('4'),
                        }"
                    >
                        4
                    </div>
                    <div
                        class="role"
                        @click="updateRole('5')"
                        :class="{
                            selected:
                                edit_mode_selected_heroes[
                                    edit_mode_selected_hero
                                ].includes('5'),
                        }"
                    >
                        5
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import {
    computeAllPicks,
    getPickWinrate,
    predictNextBest,
    fuzzySearch,
} from "../helper";
import Finder from "./Finder";
const toKey = (is_radiant) => (is_radiant ? "radiant" : "dire");

export default {
    name: "CaptainsMode",
    props: {
        heroes: Object,
        strHeroes: Object,
        agiHeroes: Object,
        intHeroes: Object,
    },
    components: {
        finder: Finder,
    },
    beforeMount() {
        let timeout = null;

        this.keydownListener = (e) => {
            if (e.shiftKey || e.altKey || e.ctrlKey) {
                return;
            }
            if (e.keyCode >= 65 && e.keyCode <= 90) {
                this.hero_filter += e.key;
            }
            if (e.keyCode === 8 && this.hero_filter.length) {
                this.hero_filter = this.hero_filter.slice(0, -1);
            }
            if (e.keyCode === 27) {
                this.hero_filter = "";
            }
            for (const key in this.heroes) {
                this.filtered[key] = !fuzzySearch(
                    this.heroes[key].local.toLowerCase(),
                    this.hero_filter
                );
            }

            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            timeout = setTimeout(() => {
                timeout = null;
                this.hero_filter = "";
                for (const key in this.filtered) {
                    this.filtered[key] = false;
                }
            }, 2500);
        };
        document.addEventListener("keydown", this.keydownListener);
        const edit_mode_selected_heroes =
            localStorage.getItem("edit_mode_heroes");
        if (edit_mode_selected_heroes) {
            const parsed = JSON.parse(edit_mode_selected_heroes);
            for (const key in parsed) {
                this.edit_mode_selected_heroes[key] = parsed[key];
            }
        }
    },
    beforeDestroy() {
        document.removeEventListener("keydown", this.keydownListener);
    },
    data() {
        return {
            custom_pool: false,
            first_pick: false,
            is_edit_mode: false,
            edit_mode_selected_heroes: Object.keys(this.heroes).reduce(
                (res, key) => {
                    res[key] = undefined;
                    return res;
                },
                {}
            ),
            edit_mode_selected_hero: undefined,
            hero_filter: "",
            use_bad: false,
            disabled: {},
            filtered: Object.keys(this.heroes).reduce((res, key) => {
                res[key] = false;
                return res;
            }, {}),
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
                [true, 8],
                [false, 8],
                [true, 9],
                [false, 9],
                [true, 10],
                [false, 10],
                [true, 11],
                [false, 11],
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
        int() {
            if (this.useCustomPool()) {
                return this.intHeroes.filter(
                    (hero) => this.edit_mode_selected_heroes[hero.id]
                );
            }
            return this.intHeroes;
        },
        str() {
            if (this.useCustomPool()) {
                return this.strHeroes.filter(
                    (hero) => this.edit_mode_selected_heroes[hero.id]
                );
            }
            return this.strHeroes;
        },
        agi() {
            if (this.useCustomPool()) {
                return this.agiHeroes.filter(
                    (hero) => this.edit_mode_selected_heroes[hero.id]
                );
            }
            return this.agiHeroes;
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
        useCustomPool() {
            if (!this.steps[this.current_step]) {
                return false;
            }
            const [is_first_team, stage] = this.steps[this.current_step];
            return (
                this.custom_pool &&
                this.first_pick === is_first_team &&
                this.order[stage].stage === "pick"
            );
        },
        clickable(index, is_radiant) {
            return (
                this.current_step >
                this.steps.findIndex(
                    (item) => item[0] === is_radiant && item[1] === index
                )
            );
        },
        toStep(index, is_radiant) {
            return (
                this.steps.findIndex(
                    (item) => item[0] === is_radiant && item[1] === index
                ) + 1
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
            if (
                this.in_progess ||
                this.is_edit_mode ||
                !this.clickable(index, is_radiant)
            ) {
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
            if (this.in_progess || this.is_edit_mode) {
                return;
            }
            this.current_step -= 1;
            this.other_heroes = undefined;
            this.selectHero(this.heroes[id]);
        },
        selectHero(hero, force) {
            if (this.is_edit_mode) {
                if (this.edit_mode_selected_heroes[hero.id]) {
                    this.edit_mode_selected_heroes[hero.id] = undefined;
                    this.edit_mode_selected_hero = undefined;
                } else {
                    this.edit_mode_selected_heroes[hero.id] = [
                        ...this.heroes[hero.id].roles,
                    ];
                    this.edit_mode_selected_hero = hero.id;
                }
                return;
            }
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
            if (this.in_progess || this.is_edit_mode) {
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

            this.other_heroes = undefined;
            this.in_progess = true;

            const getRoles = (id, is_first_team, is_pick) => {
                if (
                    this.custom_pool &&
                    is_pick &&
                    is_first_team === this.first_pick
                ) {
                    return this.edit_mode_selected_heroes[id] || [];
                }

                return this.heroes[id].roles;
            };

            const generator =
                !dire_array.length && !radiant_array.length
                    ? predictNextBest(
                          this.heroes,
                          bans_array.map(String),
                          this.use_bad,
                          getRoles,
                          once ? 4 : 1
                      )
                    : computeAllPicks(
                          radiant_array.map(String),
                          dire_array.map(String),
                          bans_array.map(String),
                          this.current_step,
                          this.use_bad,
                          this.heroes,
                          getRoles,
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
            if (this.in_progess || this.is_edit_mode) {
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
        toggleEditMode() {
            this.is_edit_mode = !this.is_edit_mode;
        },
        saveEditMode() {
            localStorage.setItem(
                "edit_mode_heroes",
                JSON.stringify(this.edit_mode_selected_heroes)
            );
            this.is_edit_mode = false;
        },
        clearEditMode() {
            for (const key in this.edit_mode_selected_heroes) {
                this.edit_mode_selected_heroes[key] = undefined;
            }
            this.is_edit_mode = false;
        },
        exportEditMode() {
            const a = document.createElement("a");
            const file = new Blob(
                [JSON.stringify(this.edit_mode_selected_heroes)],
                { type: "text/plain;charset=utf-8" }
            );
            a.href = URL.createObjectURL(file);
            a.download = "custom_roles.txt";
            a.click();
        },
        importEditMode() {
            const input = document.createElement("input");
            input.type = "file";
            input.click();
            input.onchange = (e) => {
                const file_reader = new FileReader();
                file_reader.readAsText(e.target.files[0]);
                file_reader.onload = () => {
                    this.edit_mode_selected_heroes = JSON.parse(
                        file_reader.result
                    );
                };
            };
        },
        updateRole(role) {
            if (
                this.edit_mode_selected_heroes[
                    this.edit_mode_selected_hero
                ].includes(role)
            ) {
                this.edit_mode_selected_heroes[this.edit_mode_selected_hero] =
                    this.edit_mode_selected_heroes[
                        this.edit_mode_selected_hero
                    ].filter((r) => r !== role);
            } else {
                this.edit_mode_selected_heroes[
                    this.edit_mode_selected_hero
                ].push(role);
            }
        },
    },
};
</script>