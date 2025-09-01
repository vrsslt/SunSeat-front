import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvent, Circle, } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import ForecastBar from "./ForecastBar";
function patchLeafletIcons() {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetinaUrl, iconUrl: iconUrl, shadowUrl: shadowUrl });
}
function Recenter(_a) {
    var center = _a.center;
    var map = useMap();
    var prev = useRef(center);
    useEffect(function () {
        var lat = center[0], lon = center[1];
        var _a = prev.current, plat = _a[0], plon = _a[1];
        if (lat !== plat || lon !== plon) {
            map.flyTo(center, map.getZoom(), { duration: 0.8 });
            prev.current = center;
        }
    }, [center, map]);
    return null;
}
function SyncMove(_a) {
    var onMapMove = _a.onMapMove;
    useMapEvent("moveend", function (e) {
        var m = e.target;
        var c = m.getCenter();
        onMapMove === null || onMapMove === void 0 ? void 0 : onMapMove([c.lat, c.lng]);
    });
    return null;
}
var toNum = function (v, fb) {
    if (fb === void 0) { fb = 0; }
    return (Number.isFinite(Number(v)) ? Number(v) : fb);
};
var clamp = function (n, min, max) {
    return Math.min(max, Math.max(min, n));
};
function scoreAt(t, offsetMin) {
    var _a, _b, _c;
    var s = (_b = (_a = t.forecast) === null || _a === void 0 ? void 0 : _a.find(function (f) { return f.tmin === offsetMin; })) === null || _b === void 0 ? void 0 : _b.score;
    return clamp(Math.round(toNum((_c = s !== null && s !== void 0 ? s : t.sunScore) !== null && _c !== void 0 ? _c : 0, 0)), 0, 100);
}
export default function MapView(_a) {
    var center = _a.center, items = _a.items, onMapMove = _a.onMapMove, _b = _a.zoom, zoom = _b === void 0 ? 14 : _b, offsetMin = _a.offsetMin, onSelectOffset = _a.onSelectOffset, radius = _a.radius;
    useEffect(function () {
        patchLeafletIcons();
    }, []);
    return (_jsx("div", { className: "map", style: { position: "relative" }, children: _jsxs(MapContainer, { center: center, zoom: zoom, style: { height: "100%", width: "100%" }, children: [_jsx(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "\u00A9 OpenStreetMap" }), _jsx(Recenter, { center: center }), _jsx(SyncMove, { onMapMove: onMapMove }), _jsx(Circle, { center: center, radius: radius, pathOptions: { color: "#0ea5e9", weight: 1, fillOpacity: 0.08 } }), Array.isArray(items) &&
                    items.map(function (t) {
                        var _a;
                        var score = scoreAt(t, offsetMin);
                        return (_jsx(Marker, { position: [t.lat, t.lon], children: _jsxs(Popup, { children: [_jsx("strong", { children: t.name }), _jsx("br", {}), "Score (+", offsetMin, " min): ", score, _jsx(ForecastBar, { data: t.forecast, selected: offsetMin, onSelect: onSelectOffset, compact: true })] }) }, "".concat((_a = t.id) !== null && _a !== void 0 ? _a : t.name, ":").concat(t.lat, ":").concat(t.lon)));
                    })] }) }));
}
