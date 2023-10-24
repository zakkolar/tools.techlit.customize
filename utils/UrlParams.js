/**
 * Gets the current value of a parameter from a map of parameters. Returns default value if ont found.
 * @param params
 * @param paramName
 * @param type
 * @param defaultValue
 */
export const getParam = function(params, paramName, type, defaultValue) {
    let param = params.get(paramName);
    if(param){
        switch(type){
            case PARAM_TYPES.BOOLEAN:
                param = !(param.toLowerCase() === "false");
                break;
            case PARAM_TYPES.INTEGER:
                param = parseInt(param);
                break;
            case PARAM_TYPES.ARRAY:
                console.log(decodeURIComponent(param));
                param = decodeURIComponent(param).split(",");
                break;
            default:
                param = decodeURIComponent(param);
        }
    }
    else{
        param = defaultValue;
    }
    return param;
}

export const PARAM_TYPES  = Object.freeze({
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    STRING: 'STRING',
    ARRAY: 'ARRAY'
})

export const hashToParams = function() {
    const hash = window.location.hash.substring(1);
    const params = new Map();
    hash.split("&").forEach(item => {
        const parts = item.split("=");
        if(parts.length === 2){
            params.set(parts[0], parts[1]);
        }
    })
    return params;
}