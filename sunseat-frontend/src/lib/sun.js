import SunCalc from "suncalc";
export function sunScore(lat, lon, orientationDeg, // 0=N, 90=E, 180=S, 270=O
streetWidth, at, cloudFraction // 0..1 (optionnel — ignore pour le POC)
) {
    if (at === void 0) { at = new Date(); }
    var pos = SunCalc.getPosition(at, lat, lon);
    var az = ((pos.azimuth * 180) / Math.PI + 180) % 360;
    var alt = (pos.altitude * 180) / Math.PI;
    var diff = Math.min(Math.abs(az - orientationDeg), 360 - Math.abs(az - orientationDeg));
    var score = 0;
    if (diff < 45)
        score += 55;
    else if (diff < 90)
        score += 35;
    else
        score += 10;
    if (alt < 8)
        score -= 30;
    else if (alt < 15)
        score -= 15;
    else
        score += 10;
    if (alt < 20) {
        if (streetWidth === "narrow")
            score -= 15;
        else if (streetWidth === "medium")
            score -= 5;
    }
    if (typeof cloudFraction === "number")
        score *= 1 - 0.6 * cloudFraction;
    score = Math.max(0, Math.min(100, Math.round(score)));
    var label = score > 66 ? "Soleil" : score > 33 ? "Mitigé" : "Ombre";
    return { score: score, label: label, azimuth: az, altitude: alt };
}
