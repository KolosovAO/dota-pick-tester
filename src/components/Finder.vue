<template>
    <div class="find-helper">{{ upperFilter }}</div>
</template>

<script>
export default {
    name: "Finder",
    props: {
        filter: String,
    },
    computed: {
        upperFilter() {
            return this.filter.toUpperCase();
        },
    },
};
</script>