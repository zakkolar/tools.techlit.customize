export function concatOr(list) {

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