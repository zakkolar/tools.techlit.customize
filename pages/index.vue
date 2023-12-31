<script setup>

import {getParam, hashToParams, PARAM_TYPES} from "@/utils/UrlParams.js";
import {onMounted} from "vue";
import {concatOr} from "@/utils/ConcatOr.js";
import {isValidDate} from "@/utils/Validation.js";

const STATES = Object.freeze({
    LOADING: 'LOADING',
    READY: 'READY',
    LOADED: 'LOADED',
    ERROR: 'ERROR'
})
const state = ref(null);
const errorMessage = ref(null);

function setState(newState, newErrorMessage = null) {
    state.value = newState;
    errorMessage.value = newErrorMessage;
}

setState(STATES.LOADING);

const VIEWS = Object.freeze({
    SETTINGS: 'Settings',
    PREVIEW: 'Preview',
    LINK: 'Share link'
})
const view = ref(null);

function setView(newView) {
    view.value = newView;
}

setView(VIEWS.SETTINGS);

const app = ref(null);
const params = ref({});

const pageTitle = computed(() => {
    return `Customize ${app.value ? app.value.title : ''}`
})
useHead({
    title: pageTitle
})

onMounted(() => {
    window.addEventListener('hashchange', updateFromHash);
    updateFromHash();
})

function setDefaults() {
    for (let field of app.value.fields) {
        params.value[field.key] = field.default ?? '';
    }
}

function updateFromHash() {
    const urlParams = hashToParams();
    const url = getParam(urlParams, 'url', PARAM_TYPES.STRING, '');

    if (url) {
        setState(STATES.LOADING);
        $fetch(url, {server: false}).then(res => {
            app.value = res;
            setState(STATES.LOADED);
            setDefaults();
        }).catch(e => {
            let error = e;
            if (e.name === 'FetchError') {
                error = `Could not fetch url ${url}`;
            }
            setState(STATES.ERROR, error);
        })
    } else {
        setState(STATES.READY);
    }
}

/**
 * Turns the parameters into a query string in the format key1=value1&key2=value2...
 * @returns {string}
 */
function makeQueryString() {
    let queryString = '';
    for (let field of app.value.fields) {
        if (params.value[field.key] || field.type === 'boolean') {
            // always show booleans even when false
            queryString += `${field.key}=`
            switch (field.type) {
                case 'text':
                case 'select':
                case 'number':
                case 'date':
                case 'hidden':
                case 'boolean':
                    queryString += encodeURIComponent(params.value[field.key])
                    break;
                case 'list':
                    queryString += encodeURIComponent(params.value[field.key].join(","));
                    break;
            }
            queryString += '&';
        }

    }

    if (queryString.slice(-1) === '&') {
        queryString = queryString.substring(0, queryString.length - 1);
    }

    return queryString;
}

const url = computed(() => {
    let params = '';

    switch (app.value.format) {
        case 'queryString':
            params = makeQueryString();
            break;
    }

    return `${app.value.preview_link}#${params}`;
})

function fieldByKey(key) {
    return app.value.fields.find(item => item.key === key);
}

function checkForDate(field, errors) {
    if (field.type === 'date') {
        if (!isValidDate(params.value[field.key])) {
            errors.push("Type the date in YYYY-MM-DD format");
        }
    }
}

function validateField(field, validation, errors) {
    switch (validation.type) {
        case 'unique':
            validateUnique(validation, params.value[field.key], errors);
            break;
    }
}

function validateUnique(validation, value, errors) {
    const otherValues = validation.fields.map(item => params.value[item]);
    const otherValueNames = validation.fields.map(item => fieldByKey(item).label);
    if (otherValues.includes(value)) {
        errors.push(`Should not have the same value as ${concatOr(otherValueNames)}`);
    }
}


const errors = computed(() => {
    const fields = {};

    if (app.value) {
        for (let field of app.value.fields) {
            const errors = [];
            const requiredError = field.required && !params.value[field.key];

            checkForDate(field, errors);

            for (let validation of (field.validation || [])) {
                validateField(field, validation, errors);
            }

            // Don't show a list of irrelevant errors if the field hasn't been filled in
            if (requiredError) {
                fields[field.key] = ['Required value'];
            } else if (errors.length > 0) {
                fields[field.key] = errors;
            }
        }
    }

    return fields;

})

const formValid = computed(() => {
    return Object.keys(errors.value).length === 0
})

const showCopy = ref(false);

function copyUrl() {
    document.getElementById('url').select();
    navigator.clipboard.writeText(url.value);
    showCopy.value = true;
    setTimeout(() => showCopy.value = false, 1000);
}

function select(e) {
    e.target.select()
}

function disableButton(type) {
    return (!formValid.value && (type === VIEWS.PREVIEW || type === VIEWS.LINK))
}

function setManifest() {
    const manifestUrl = document.getElementById('url')?.value;
    if(manifestUrl) {
        window.location.hash = `url=${manifestUrl}`;
        updateFromHash();
    }
}

function clearManifest() {
    window.location.hash = '';
    updateFromHash();
}


</script>
<template>
    <div v-if="state === STATES.LOADING">
        Loading...
    </div>
    <div v-if="state === STATES.READY">
        <form @submit.prevent="setManifest">
            <label for="url">Manifest URL</label>
            <input id="url" placeholder="https://digitalfootprint.techlit.app/customize/anonymousEmail.json" type="url" class="block outline-none focus:ring-blue-500 w-full rounded-md border-0 mb-4 mt-1 p-1.5 text-gray-900 shadow-sm ring-2 ring-inset ring-gray-300 placeholder:text-gray-400 ">
            <button class="border p-1 rounded bg-gray-200">Load</button>
        </form>

    </div>
    <div v-if="state === STATES.ERROR">
        <h1 class="text-2xl">Error</h1>
        <p class="my-4 ">{{ errorMessage }}</p>
        <button class="border p-1 rounded bg-gray-200" @click="clearManifest">Try another URL</button>
    </div>
    <div v-if="state === STATES.LOADED">
        <h1 class="text-3xl mt-4 text-center">Customize {{ app.title }}</h1>
        <nav class="my-4 border-b sticky top-0 bg-white max-w-screen-md mx-auto">
            <div v-for="type of VIEWS" class="group relative inline-block">
                <button
                        class="relative p-4 inline-block mr-2 disabled:text-gray-400 peer"
                        :disabled="disableButton(type)"
                        :class="{
                        'border-b-4 border-blue-600 text-blue-600': type === view,
                        'cursor-not-allowed': disableButton(type)
                    }"
                        @click="setView(type)"
                >{{ type }}
                </button>
                <div v-if="disableButton(type)"
                     class="text-xs max-w-[200px] absolute top-[40px] left-[-50%] bg-red-100 z-50 hidden peer-hover:block p-1 rounded text-red-800">
                    Please fix the errors in the form
                </div>
            </div>

        </nav>

        <form v-if="view === VIEWS.SETTINGS" class="max-w-screen-md mx-auto leading-7">
            <p v-if="app.description">{{ app.description }}</p>

            <p class="mt-2 mb-4">Use the form below to customize your settings. Then click "Share link" to copy and share the URL with your settings.</p>

            <p v-if="!formValid" class="mt-4 text-red-700 inline-block bg-red-100 p-2 ">Please fix the errors below before previewing and sharing the link.</p>

            <div v-for="field of app.fields" class="mb-4 group" :class="{error: errors[field.key]}">

                <label v-if="!['boolean'].includes(field.type)" :for="field.key">{{ field.label }}</label>

                <div v-if="errors[field.key]" class="text-red-500 text-sm">
                    <p v-for="error in errors[field.key]">
                        {{ error }}
                    </p>
                </div>

                <div v-if="['text','date','number'].includes(field.type)">

                    <input class="block outline-none focus:ring-blue-500 w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-2 ring-inset ring-gray-300 placeholder:text-gray-400 group-[.error]:outline-red"
                           v-model="params[field.key]" :type="field.type" :id="field.key">
                </div>

                <div v-if="field.type === 'select'">

                    <select :id="field.key" v-model="params[field.key]"
                            class="block outline-none focus:ring-blue-500 w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-2 ring-inset ring-gray-300">
                        <option v-if="!field.required"></option>
                        <option v-for="(option, key) of field.options" :value="key">{{ option }}</option>
                    </select>
                </div>

                <div v-if="field.type === 'list'">
                    <p class="text-sm">One item per line</p>
                    <textarea :id="field.key" @input="params[field.key] = $event.target.value.split('\n')"
                              :value="params[field.key].join('\n')"
                              class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-2 focus:ring-blue-500 ring-inset ring-gray-300 placeholder:text-gray-400 outline-none "
                              :rows="field.rows || 5"></textarea>
                </div>
                <div v-if="field.type === 'boolean'">
                    <label class="font-medium text-gray-900">
                        <input v-model="params[field.key]" type="checkbox"
                               class="h-4 w-4 rounded border-gray-300 outline-none text-white bg-blue-500 focus:outline-blue-500">
                        <span class="pl-2">{{ field.label }}</span></label>
                </div>
                <p class="text-sm text-gray-700 mt-1" v-if="field.description">{{ field.description }}</p>


            </div>
        </form>

        <div v-if="view === VIEWS.PREVIEW">
            <p class="my-4"><a class="text-blue-600" :href="url" target="_blank">Preview in a new window
                <Icon name="ri:external-link-line"></Icon>
            </a></p>
            <iframe :src="url" class="w-full border shadow-md h-[500px]"></iframe>
        </div>

        <div v-if="view === VIEWS.LINK" class="max-w-screen-md mx-auto">
            <p class="py-4">Copy and share this link to use "{{ app.title }}" with your settings.</p>
            <label for="url" class="sr-only">URL</label>
            <div class="relative mt-2 rounded-md shadow-sm">
                <input id="url" readonly
                       class="block w-full outline-none rounded-md border-0 py-1.5 pl-1.5 pr-18 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                       :value="url" type="text" @focus="select">
                <div class="absolute inset-y-0 right-0 flex items-center">
                    <button class="h-full rounded-md rounded-l-none border-0 active:scale-105 transition-all py-0 pl-2 pr-3 bg-gray-200"
                            @click="copyUrl">Copy
                    </button>
                    <Transition>
                        <div v-if="showCopy"
                             class="absolute text-sm bg-green-400 p-1 rounded left-[-50px] bottom-[4px]">
                            Copied!
                        </div>
                    </Transition>
                </div>

            </div>

        </div>


    </div>


</template>
<style scoped>
label {
    @apply block text-sm font-medium leading-6 text-gray-900;
}

.v-enter-active,
.v-leave-active {
    transition: opacity 0.2s ease;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}

</style>