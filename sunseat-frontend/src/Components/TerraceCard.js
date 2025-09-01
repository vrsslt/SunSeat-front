import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ForecastBar from "./ForecastBar";
var clamp = function (n, min, max) {
    return Math.min(max, Math.max(min, n));
};
var toNum = function (v, fb) {
    if (fb === void 0) { fb = 0; }
    return (Number.isFinite(Number(v)) ? Number(v) : fb);
};
function scoreAt(t, offsetMin) {
    var _a, _b, _c;
    var s = (_b = (_a = t.forecast) === null || _a === void 0 ? void 0 : _a.find(function (f) { return f.tmin === offsetMin; })) === null || _b === void 0 ? void 0 : _b.score;
    return clamp(Math.round(toNum((_c = s !== null && s !== void 0 ? s : t.sunScore) !== null && _c !== void 0 ? _c : 0, 0)), 0, 100);
}
export default function TerraceCard(_a) {
    var t = _a.t, offsetMin = _a.offsetMin, onSelectOffset = _a.onSelectOffset;
    var score = scoreAt(t, offsetMin);
    var badgeClass = score > 66
        ? "badge badge--sunny"
        : score > 33
            ? "badge badge--mixed"
            : "badge badge--shade";
    return (_jsxs("div", { className: "card terrace", children: [_jsxs("div", { className: "terrace__top", children: [_jsx("strong", { children: t.name || "Sans nom" }), _jsx("span", { className: badgeClass, children: score })] }), _jsxs("div", { className: "meta", children: [Math.round(t.distance_m || 0), " m \u2022 orient.", " ", Math.round(t.orientationDeg), "\u00B0 \u2022 ", t.streetWidth] }), _jsx(ForecastBar, { data: t.forecast, selected: offsetMin, onSelect: onSelectOffset })] }));
}
