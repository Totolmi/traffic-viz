<script setup>
  defineProps({
    src:   { type: String, required: true },
    title: { type: String, required: true },
    desc:  { type: String, default: '' },
  })
</script>

<template>
  <figure class="card">
    <img :src="src" :alt="title" />
    <figcaption>
      <h3>{{ title }}</h3>
      <p v-if="desc">{{ desc }}</p>
    </figcaption>
  </figure>
</template>

<style scoped>
  .card {
    margin: 0;
    background: #fff;
    border: 1px solid #e3e6ea;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 0 5px;
  }
  .card img {
    display: block;
    width: 100%;
    height: auto;
  }
  figcaption {
    padding: 12px 14px 16px;
    border-top: 1px solid #eef1f4;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
  }
  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #6b7280;
  }
</style>