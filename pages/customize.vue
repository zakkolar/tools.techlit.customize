<script setup>
import {onMounted} from "vue";
import {getParam, hashToParams, PARAM_TYPES} from "~/utils/UrlParams.js";


const app = ref(null);


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
    if(url) {
        state.value = STATES.LOADING;

        $fetch(url, {server: false}).then(res => {
        app.value = res;
        state.value = STATES.LOADED;
        for(let field of app.value.fields) {
            params.value[field.key] = field.default || '';
        }

    })
    }

    else {
        state.value = STATES.READY;
    }


}

const url = computed( ()=> {

    let previewString = '';

    for(let field of app.value.fields) {
        if(params.value[field.key]) {
            previewString+= `${field.key}=`
            switch(field.type) {
                case 'text':
                case 'select':
                    previewString+= encodeURIComponent(params.value[field.key])
                    break;
                case 'list':
                    previewString += encodeURIComponent(params.value[field.key].join(","));
                    break;
            }
            previewString += '&';
        }

    }

    if(previewString.slice(-1) === '&') {
        previewString = previewString.substring(0, previewString.length - 1);
    }

    return `${app.value.preview_link}#${previewString}`;
})

function fieldByKey(key) {
    return app.value.fields.find(item => item.key === key);
}

function makeOr(list) {

    if(!Array.isArray(list) || list.length === 0) {
        throw new Error("Please provide a non-empty list")
    }

    if(list.length === 1) {
        return list[0];
    }

    if(list.length === 2) {
        return list.join(" or ");
    }

    return list.slice(0, list.length - 1).join(", ") + ", or "+list.slice(-1);
}

const errors = computed(() => {
    const fields = {};

    if(app.value) {
        for(let field of app.value.fields) {
            const errors = [];
            if(field.required) {
                if(!params.value[field.key]) {
                    errors.push('Required value')
                }
            }
            for(let validation of (field.validation || [])) {
                switch(validation.type) {
                    case 'unique':
                        const myValue = params.value[field.key];
                        const otherValues = validation.fields.map(item => params.value[item]);
                        const otherValueNames = validation.fields.map(item => fieldByKey(item).label);
                        if(otherValues.includes(myValue)) {
                            errors.push(`Should not have the same value as ${makeOr(otherValueNames)}`);
                        }
                        break;
                }
            }
            if(errors.length > 0) {
                fields[field.key] = errors;
            }
        }
    }


    if(Object.keys(fields).length === 0 ) {
        return null;
    }

    return fields;

})

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
            <h2 class="text-2xl">Customize {{app.title}}</h2>
            <div v-for="field of app.fields" class="mb-4">
                <div v-if="field.type === 'text'">
                    <label :for="field.key">{{field.label}}</label>
                    <input class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400" v-model="params[field.key]" type="text" :id="field.key">
                </div>

                <div v-if="field.type === 'select'">
                    <label :for="field.key">
                        {{field.label}}
                    </label>
                    <select :id="field.key" v-model="params[field.key]" class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300">
                        <option v-if="!field.required"></option>
                        <option v-for="(option, key) of field.options" :value="key">{{option}}</option>
                    </select>
                </div>

                <div v-if="field.type === 'list'">
                    <label :for="field.key">
                        {{field.label}} (one per line)
                    </label>
                    <textarea :id="field.key" @input="params[field.key] = $event.target.value.split('\n')" :value="params[field.key].join('\n')"  class="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400" :rows="field.rows || 5"></textarea>
                </div>

                <div v-if="errors && errors[field.key]">
                    <p v-for="error in errors[field.key]">
                        {{error}}
                    </p>
                </div>
                <p class="text-sm text-gray-700" v-if="field.description">{{field.description}}</p>
            </div>
        </form>

        <div class="border-l p-4">
            <h2 class="text-2xl">Preview</h2>
            <iframe class="w-full h-[90vh]" :src="url"></iframe>
        </div>



    </div>



</template>
<style scoped>
label {
    @apply block text-sm font-medium leading-6 text-gray-900
}
</style>