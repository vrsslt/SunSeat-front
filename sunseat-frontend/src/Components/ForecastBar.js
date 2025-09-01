import { jsx as _jsx } from "react/jsx-runtime";
function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}
function bucket(score) {
    if (score > 66)
        return "sunny";
    if (score > 33)
        return "mixed";
    return "shade";
}
export default function ForecastBar(_a) {
    var data = _a.data, selected = _a.selected, onSelect = _a.onSelect, _b = _a.compact, compact = _b === void 0 ? false : _b;
    if (!data || !data.length)
        return null;
    var maxH = compact ? 22 : 28;
    var baseH = compact ? 6 : 8;
    return (_jsx("div", { className: "forecast", children: data.map(function (f) {
            var _a;
            var _b;
            var score = clamp(Math.round((_b = f.score) !== null && _b !== void 0 ? _b : 0), 0, 100);
            var h = baseH + Math.round((score / 100) * maxH);
            var isSel = f.tmin === selected;
            var hue = bucket(score);
            return (_jsx("div", { title: "+".concat(f.tmin, " min: ").concat(score), className: "forecast__bar ".concat(isSel ? "forecast__bar--selected" : ""), "data-c": hue, style: (_a = {}, _a["--h"] = "".concat(h, "px"), _a), onClick: function () { return onSelect === null || onSelect === void 0 ? void 0 : onSelect(f.tmin); }, onMouseDown: function (e) { return onSelect && e.preventDefault(); } }, f.tmin));
        }) }));
}
