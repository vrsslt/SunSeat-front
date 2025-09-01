import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
export function patchLeafletDefaultIcon() {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetinaUrl, iconUrl: iconUrl, shadowUrl: shadowUrl });
}
