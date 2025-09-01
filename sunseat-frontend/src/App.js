var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { api } from "./lib/api";
import MapView from "./Components/MapView";
import TerraceCard from "./Components/TerraceCard";
import "leaflet/dist/leaflet.css";
import "./styles.css";
/* Utils */
var toNum = function (v, fb) {
    if (fb === void 0) { fb = 0; }
    return (Number.isFinite(Number(v)) ? Number(v) : fb);
};
var clamp = function (n, min, max) {
    return Math.min(max, Math.max(min, n));
};
var OFFSETS = [0, 15, 30, 45, 60, 90, 120];
/* Distance Haversine (mètres) */
function distMeters(aLat, aLon, bLat, bLon) {
    var R = 6371000;
    var dLat = ((bLat - aLat) * Math.PI) / 180;
    var dLon = ((bLon - aLon) * Math.PI) / 180;
    var lat1 = (aLat * Math.PI) / 180;
    var lat2 = (bLat * Math.PI) / 180;
    var sin1 = Math.sin(dLat / 2);
    var sin2 = Math.sin(dLon / 2);
    var a = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
/* Normalisation */
function normalizeItem(item) {
    var _a, _b, _c, _d, _e;
    var ori = toNum((_a = item.orientationDeg) !== null && _a !== void 0 ? _a : item.orientation_deg, 0);
    var mod = ori % 360;
    return __assign(__assign({}, item), { id: Number.isFinite(toNum(item.id, NaN)) ? toNum(item.id) : undefined, name: String((_b = item.name) !== null && _b !== void 0 ? _b : "Sans nom").trim() || "Sans nom", lat: toNum(item.lat, 48.8566), lon: toNum(item.lon, 2.3522), orientationDeg: clamp(mod < 0 ? mod + 360 : mod, 0, 360), streetWidth: ["narrow", "medium", "wide"].includes(item.streetWidth)
            ? item.streetWidth
            : item.street_width === "narrow" ||
                item.street_width === "medium" ||
                item.street_width === "wide"
                ? item.street_width
                : "medium", distance_m: toNum((_d = (_c = item.distance_m) !== null && _c !== void 0 ? _c : item.distance) !== null && _d !== void 0 ? _d : item.distanceMeters, 0), sunScore: clamp(toNum((_e = item.sunScore) !== null && _e !== void 0 ? _e : item.score, 0), 0, 100), forecast: Array.isArray(item.forecast)
            ? item.forecast.map(function (f) { return ({
                tmin: toNum(f === null || f === void 0 ? void 0 : f.tmin, 0),
                score: clamp(toNum(f === null || f === void 0 ? void 0 : f.score, 0), 0, 100),
            }); })
            : undefined });
}
function keyFrom(t) {
    var idPart = t.id
        ? "id".concat(t.id)
        : "nm".concat((t.name || "").toLowerCase().replace(/\s+/g, "-"));
    var lat = toNum(t.lat, 0).toFixed(6);
    var lon = toNum(t.lon, 0).toFixed(6);
    var ori = Math.round(toNum(t.orientationDeg, 0));
    return "".concat(idPart, ":").concat(lat, ":").concat(lon, ":").concat(ori);
}
function dedupe(arr, getKey) {
    var seen = new Set();
    return arr.filter(function (x) {
        var k = getKey(x);
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
}
function scoreAt(t, offsetMin) {
    var _a, _b, _c;
    var s = (_b = (_a = t.forecast) === null || _a === void 0 ? void 0 : _a.find(function (f) { return f.tmin === offsetMin; })) === null || _b === void 0 ? void 0 : _b.score;
    return clamp(Math.round(toNum((_c = s !== null && s !== void 0 ? s : t.sunScore) !== null && _c !== void 0 ? _c : 0, 0)), 0, 100);
}
/* Geocoding */
function searchLocation(query) {
    return __awaiter(this, void 0, void 0, function () {
        var res, data, r, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch("https://nominatim.openstreetmap.org/search?format=json&q=".concat(encodeURIComponent(query), "&limit=1&addressdetails=1"), { headers: { Accept: "application/json" } })];
                case 1:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 2:
                    data = _b.sent();
                    if (Array.isArray(data) && data.length > 0) {
                        r = data[0];
                        return [2 /*return*/, {
                                lat: parseFloat(r.lat),
                                lon: parseFloat(r.lon),
                                display_name: r.display_name,
                            }];
                    }
                    return [2 /*return*/, null];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/* Villes test */
var TEST_CITIES = [
    { name: "🇫🇷 Paris", coords: [48.8566, 2.3522] },
    { name: "🦁 Lyon", coords: [45.764, 4.8357] },
    { name: "⚓ Marseille", coords: [43.2965, 5.3698] },
    { name: "🌴 Nice", coords: [43.7102, 7.262] },
    { name: "🏔️ Grenoble", coords: [45.1885, 5.7245] },
    { name: "🍷 Bordeaux", coords: [44.8378, -0.5792] },
];
export default function App() {
    var _this = this;
    var _a = useState([]), items = _a[0], setItems = _a[1];
    var _b = useState([48.8566, 2.3522]), center = _b[0], setCenter = _b[1];
    var _c = useState(false), loading = _c[0], setLoading = _c[1];
    var _d = useState(null), setError = _d[1];
    var _e = useState("Ma position"), currentCity = _e[0], setCurrentCity = _e[1];
    var _f = useState(""), searchQuery = _f[0], setSearchQuery = _f[1];
    var _g = useState(false), searchLoading = _g[0], setSearchLoading = _g[1];
    var _h = useState(null), searchError = _h[0], setSearchError = _h[1];
    var _j = useState(false), autoRefresh = _j[0], setAutoRefresh = _j[1];
    var _k = useState(null), lastUpdate = _k[0], setLastUpdate = _k[1];
    var _l = useState(0), offsetMin = _l[0], setOffsetMin = _l[1];
    /* 🎯 NOUVEAU : rayon + “rechercher ici” */
    var _m = useState(800), radius = _m[0], setRadius = _m[1];
    var _o = useState(null), pendingCenter = _o[0], setPendingCenter = _o[1];
    var _p = useState(false), dirty = _p[0], setDirty = _p[1];
    var load = function (lat_1, lon_1, cityName_1) {
        var args_1 = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args_1[_i - 3] = arguments[_i];
        }
        return __awaiter(_this, __spreadArray([lat_1, lon_1, cityName_1], args_1, true), void 0, function (lat, lon, cityName, r) {
            var data, raw, norm, e_1;
            if (r === void 0) { r = radius; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setLoading(true);
                        setError(null);
                        if (cityName)
                            setCurrentCity(cityName);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, api.get("/terraces/nearby", {
                                params: { lat: lat, lon: lon, radius: r, forecast: true },
                            })];
                    case 2:
                        data = (_a.sent()).data;
                        raw = Array.isArray(data)
                            ? data
                            : Array.isArray(data === null || data === void 0 ? void 0 : data.items)
                                ? data.items
                                : [];
                        norm = dedupe(raw.map(normalizeItem), keyFrom)
                            .map(function (t) {
                            // calcule/écrase distance côté client pour être sûr
                            var d = distMeters(lat, lon, t.lat, t.lon);
                            return __assign(__assign({}, t), { distance_m: d });
                        })
                            .filter(function (t) { return t.distance_m <= r; });
                        setItems(norm);
                        setLastUpdate(new Date());
                        return [3 /*break*/, 5];
                    case 3:
                        e_1 = _a.sent();
                        setError((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || "Erreur lors du chargement");
                        setItems([]);
                        return [3 /*break*/, 5];
                    case 4:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    var handleSearch = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var result, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    if (!searchQuery.trim())
                        return [2 /*return*/];
                    setSearchLoading(true);
                    setSearchError(null);
                    return [4 /*yield*/, searchLocation(searchQuery)];
                case 1:
                    result = _a.sent();
                    if (!result) return [3 /*break*/, 3];
                    c = [result.lat, result.lon];
                    setCenter(c);
                    setCurrentCity(searchQuery);
                    return [4 /*yield*/, load.apply(void 0, __spreadArray(__spreadArray([], c, false), [searchQuery, radius], false))];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    setSearchError("Lieu non trouvé");
                    _a.label = 4;
                case 4:
                    setSearchLoading(false);
                    return [2 /*return*/];
            }
        });
    }); };
    useEffect(function () {
        var id;
        if (autoRefresh) {
            id = setInterval(function () { return load(center[0], center[1], currentCity, radius); }, 2 * 60 * 1000);
        }
        return function () {
            if (id)
                clearInterval(id);
        };
    }, [autoRefresh, center[0], center[1], currentCity, radius]);
    useEffect(function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (p) {
                var c = [p.coords.latitude, p.coords.longitude];
                setCenter(c);
                setCurrentCity("Ma position");
                load.apply(void 0, __spreadArray(__spreadArray([], c, false), [undefined, radius], false));
            }, function () { return load(center[0], center[1], undefined, radius); }, { enableHighAccuracy: true, timeout: 8000 });
        }
        else {
            load(center[0], center[1], undefined, radius);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    var sorted = useMemo(function () {
        var uniq = dedupe(items, keyFrom);
        return __spreadArray([], uniq, true).sort(function (a, b) { return scoreAt(b, offsetMin) - scoreAt(a, offsetMin); });
    }, [items, offsetMin]);
    /* Actions */
    var recenterToMe = function () {
        if (!navigator.geolocation)
            return;
        navigator.geolocation.getCurrentPosition(function (p) {
            var c = [p.coords.latitude, p.coords.longitude];
            setCenter(c);
            setCurrentCity("Ma position");
            load.apply(void 0, __spreadArray(__spreadArray([], c, false), [undefined, radius], false));
        });
    };
    var refreshHere = function () { return load(center[0], center[1], currentCity, radius); };
    var testCity = function (city) {
        setCenter(city.coords);
        load.apply(void 0, __spreadArray(__spreadArray([], city.coords, false), [city.name, radius], false));
    };
    var handleMapMove = function (c) {
        setPendingCenter(c);
        setDirty(true);
    };
    var applySearchHere = function () {
        if (!pendingCenter)
            return;
        setCenter(pendingCenter);
        setDirty(false);
        load(pendingCenter[0], pendingCenter[1], currentCity, radius);
    };
    return (_jsxs("div", { className: "app", children: [_jsxs("aside", { className: "sidebar", children: [_jsx("h2", { style: { margin: 0 }, children: "SunSeat" }), _jsxs("form", { onSubmit: handleSearch, style: { margin: ".75rem 0" }, children: [_jsxs("div", { style: { display: "flex", gap: ".5rem" }, children: [_jsx("input", { className: "input", placeholder: "Rechercher une ville...", value: searchQuery, onChange: function (e) { return setSearchQuery(e.target.value); }, disabled: searchLoading }), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: searchLoading || !searchQuery.trim(), children: "\uD83D\uDD0D" })] }), searchError && (_jsxs("p", { style: {
                                    margin: ".5rem 0 0 0",
                                    color: "#d32f2f",
                                    fontSize: ".8rem",
                                }, children: ["\u26A0\uFE0F ", searchError] }))] }), _jsxs("div", { className: "card", style: { marginBottom: ".75rem" }, children: [_jsx("div", { children: _jsxs("strong", { children: ["\uD83D\uDCCD ", currentCity] }) }), lastUpdate && (_jsxs("div", { style: { fontSize: ".8rem", color: "#666", marginTop: ".3rem" }, children: ["Derni\u00E8re maj: ", lastUpdate.toLocaleTimeString()] }))] }), _jsxs("div", { className: "toolbar", style: { marginBottom: ".75rem" }, children: [_jsx("button", { className: "btn", onClick: recenterToMe, children: "\uD83D\uDCCD Ma position" }), _jsxs("button", { className: "btn btn-ghost", onClick: refreshHere, disabled: loading, children: [loading ? "⏳" : "🔄", " Actualiser"] }), _jsxs("label", { style: { display: "inline-flex", alignItems: "center", gap: 8 }, children: [_jsx("input", { type: "checkbox", checked: autoRefresh, onChange: function (e) { return setAutoRefresh(e.target.checked); } }), _jsx("span", { style: { fontSize: ".85rem", color: "#666" }, children: "Auto (2 min)" })] })] }), _jsx("div", { className: "section-title", children: "Rayon de recherche" }), _jsxs("div", { className: "card", style: { display: "grid", gap: 8 }, children: [_jsx("input", { type: "range", min: 100, max: 3000, step: 50, value: radius, onChange: function (e) { return setRadius(parseInt(e.target.value, 10)); } }), _jsxs("div", { style: { fontSize: ".85rem", color: "#666" }, children: ["Rayon : ", _jsxs("strong", { children: [radius, " m"] }), _jsx("button", { className: "btn btn-ghost", style: { marginLeft: 8 }, onClick: function () { return load(center[0], center[1], currentCity, radius); }, children: "Appliquer" })] })] }), _jsx("div", { className: "section-title", children: "Horizon" }), _jsx("div", { className: "chips", style: { marginBottom: ".75rem" }, children: OFFSETS.map(function (m) { return (_jsxs("button", { className: "chip ".concat(m === offsetMin ? "chip--active" : ""), onClick: function () { return setOffsetMin(m); }, children: ["+", m] }, m)); }) }), _jsx("div", { className: "section-title", children: "Tester d'autres villes" }), _jsx("div", { className: "chips", style: { marginBottom: ".75rem" }, children: TEST_CITIES.map(function (c) { return (_jsx("button", { className: "chip ".concat(currentCity === c.name ? "chip--active" : ""), onClick: function () { return testCity(c); }, children: c.name }, c.name)); }) }), _jsxs("div", { className: "stat", children: ["\uD83D\uDCCA ", sorted.length, " terrasse", sorted.length !== 1 ? "s" : "", " trouv\u00E9e", sorted.length !== 1 ? "s" : "", sorted.length > 0 && (_jsxs(_Fragment, { children: [" ", _jsx("br", {}), "\u2600\uFE0F Meilleur score (+", offsetMin, " min):", " ", scoreAt(sorted[0], offsetMin), " ", _jsx("br", {}), "\uD83D\uDCCF Rayon: ", radius, " m", " "] }))] }), _jsxs("div", { style: { marginTop: "1rem" }, children: [sorted.length === 0 && !loading ? (_jsxs("div", { className: "card", style: { textAlign: "center", color: "#666" }, children: ["\uD83D\uDE14 Aucune terrasse trouv\u00E9e", _jsx("br", {}), _jsx("small", { children: "Augmentez le rayon ou d\u00E9placez la carte" })] })) : null, sorted.map(function (t) { return (_jsx(TerraceCard, { t: t, offsetMin: offsetMin, onSelectOffset: setOffsetMin }, keyFrom(t))); })] })] }), _jsxs("main", { style: { position: "relative" }, children: [_jsx(MapView, { center: center, items: sorted, onMapMove: handleMapMove, offsetMin: offsetMin, onSelectOffset: setOffsetMin, radius: radius }), dirty && (_jsx("button", { className: "btn map-overlay", onClick: applySearchHere, children: "\uD83D\uDD0E Rechercher dans cette zone" }))] })] }));
}
