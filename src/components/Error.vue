<template>
    <div class="error">{{ message }}</div>
</template>

<script>
export default {
    name: "ErrorMessage",
    props: {
        message: String,
    },
};
</script>