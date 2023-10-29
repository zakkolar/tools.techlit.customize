<script setup>

import {getParam, hashToParams, PARAM_TYPES} from "~/utils/UrlParams.js";
import {onMounted} from "vue";

const app = ref(null);

const pageTitle = computed(() => {
    return `Customize ${app.value ? app.value.title : ''}`
})

useHead({
    title: pageTitle
})


const params = ref({});


onMounted(() => {
    window.addEventListener('hashchange', updateFromHash);
    updateFromHash();
})

const STATES = Object.freeze({
    LOADING: 'LOADING',
    READY: 'READY',
    LOADED: 'LOADED'

})

const state = ref(STATES.LOADING);

function updateFromHash() {

    const urlParams = hashToParams();
    const url = getParam(urlParams, 'url', PARAM_TYPES.STRING, '');


    if (url) {
        state.value = STATES.LOADING;

        $fetch(url, {server: false}).then(res => {
            app.value = res;
            state.value = STATES.LOADED;
            for (let field of app.value.fields) {
                params.value[field.key] = field.default ?? '';
            }

        })
    } else {
        state.value = STATES.READY;
    }


}

const url = computed(() => {

    let paramString = '';

    for (let field of app.value.fields) {
        if (params.value[field.key] || field.type === 'boolean') {
            // always show booleans even when false
            paramString += `${field.key}=`
            switch (field.type) {
                case 'text':
                case 'select':
                case 'number':
                case 'date':
                case 'boolean':
                    paramString += encodeURIComponent(params.value[field.key])
                    break;
                case 'list':
                    paramString += encodeURIComponent(params.value[field.key].join(","));
                    break;
            }
            paramString += '&';
        }

    }

    if (paramString.slice(-1) === '&') {
        paramString = paramString.substring(0, paramString.length - 1);
    }

    return `${app.value.preview_link}#${paramString}`;
})

function fieldByKey(key) {
    return app.value.fields.find(item => item.key === key);
}

function makeOr(list) {

    if (!Array.isArray(list) || list.length === 0) {
        throw new Error("Please provide a non-empty list")
    }

    if (list.length === 1) {
        return list[0];
    }

    if (list.length === 2) {
        return list.join(" or ");
    }

    return list.slice(0, list.length - 1).join(", ") + ", or " + list.slice(-1);
}

const isValidDate = date => {
    const IsoDateRe = new RegExp("^([0-9]{4})-([0-9]{2})-([0-9]{2})$");
    const matches = date.match(IsoDateRe);
    if (!matches) return false;

    const [year, month, day] = matches.slice(1).map(item => parseInt(item));
    const composedDate = new Date(year, month - 1, day);

    return ((composedDate.getMonth() === month - 1) &&
        (composedDate.getDate() === day) &&
        (composedDate.getFullYear() === year));

}


const errors = computed(() => {
    const fields = {};


    if (app.value) {
        for (let field of app.value.fields) {
            let requiredError = false;
            const errors = [];
            const myValue = params.value[field.key];
            if (field.required && !params.value[field.key]) {
                requiredError = true;

            }
            if (field.type === 'date') {
                if (!isValidDate(myValue)) {
                    errors.push("Type the date in YYYY-MM-DD format");
                }

            }
            for (let validation of (field.validation || [])) {
                switch (validation.type) {
                    case 'unique':
                        const otherValues = validation.fields.map(item => params.value[item]);
                        const otherValueNames = validation.fields.map(item => fieldByKey(item).label);
                        if (otherValues.includes(myValue)) {
                            errors.push(`Should not have the same value as ${makeOr(otherValueNames)}`);
                        }
                        break;
                }
            }
            if (requiredError) {
                fields[field.key] = ['Required value'];
            } else if (errors.length > 0) {
                fields[field.key] = errors;
            }
        }
    }


    if (Object.keys(fields).length === 0) {
        return null;
    }

    return fields;

})

function copyUrl() {
    const field = document.getElementById('url');
    field.select();
    navigator.clipboard.writeText(url.value);
}

</script>
<template>
    <div v-if="state === STATES.LOADING">
        Loading...
    </div>
    <div v-if="state === STATES.READY">
        Ready
    </div>
    <div v-if="state === STATES.LOADED" class="grid grid-cols-2 gap-2">
        <form class="p-4">
            <h2 class="text-2xl">Customize {{ app.title }}</h2>
            <div v-for="field of app.fields" class="mb-4 group" :class="{error: errors && errors[field.key]}">

                <label v-if="!['boolean'].includes(field.type)" :for="field.key">{{ field.label }}</label>

                <div v-if="errors && errors[field.key]" class="text-red-500 text-sm">
                    <p v-for="error in errors[field.key]">
                        {{ error }}
                    </p>
                </div>

                <div v-if="['text','date','number'].includes(field.type)">

                    <input class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 group-[.error]:outline-red"
                           v-model="params[field.key]" :type="field.type" :id="field.key">
                </div>

                <div v-if="field.type === 'select'">

                    <select :id="field.key" v-model="params[field.key]"
                            class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300">
                        <option v-if="!field.required"></option>
                        <option v-for="(option, key) of field.options" :value="key">{{ option }}</option>
                    </select>
                </div>

                <div v-if="field.type === 'list'">
                    <p class="text-sm">One item per line</p>
                    <textarea :id="field.key" @input="params[field.key] = $event.target.value.split('\n')"
                              :value="params[field.key].join('\n')"
                              class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400"
                              :rows="field.rows || 5"></textarea>
                </div>
                <div v-if="field.type === 'boolean'">
                    <label class="font-medium text-gray-900">
                        <input v-model="params[field.key]" type="checkbox"
                                                                    class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600">
                        <span class="pl-2">{{ field.label }}</span></label>
                </div>
                <p class="text-sm text-gray-700 mt-1" v-if="field.description">{{ field.description }}</p>


            </div>
        </form>

        <div class="border-l p-4">
            <h2 class="text-2xl">Link</h2>
            <label for="url">URL</label>
            <div class="relative mt-2 rounded-md shadow-sm">
                <input id="url" readonly
                       class="block w-full rounded-md border-0 py-1.5 pl-1.5 pr-18 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                       :value="url" type="text" @focus="$event.target.select()">
                <div class="absolute inset-y-0 right-0 flex items-center">
                    <button class="h-full rounded-md rounded-l-none border-0 py-0 pl-2 pr-3 bg-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                            @click="copyUrl">Copy
                    </button>
                </div>

            </div>

            <p class="mt-2"><a class="text-blue-600" :href="url" target="_blank">Preview
                <Icon name="ri:external-link-line"></Icon>
            </a></p>
        </div>


    </div>


</template>
<style scoped>
label {
    @apply block text-sm font-medium leading-6 text-gray-900;
}
</style>