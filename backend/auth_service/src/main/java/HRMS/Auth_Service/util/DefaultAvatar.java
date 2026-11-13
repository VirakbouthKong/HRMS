package HRMS.Auth_Service.util;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * The picture shown when someone has not uploaded a photo: a coloured circle with the initials of the
 * username, or a plain person silhouette for an employee who has no account. Returned as SVG.
 */
public final class DefaultAvatar {

    public static final String CONTENT_TYPE = "image/svg+xml";

    private static final String[] COLOURS = {
            "#1E88E5", "#43A047", "#E53935", "#8E24AA", "#FB8C00", "#00897B", "#3949AB", "#6D4C41"
    };

    private static final byte[] SILHOUETTE = ("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\""
            + " width=\"128\" height=\"128\"><circle cx=\"64\" cy=\"64\" r=\"64\" fill=\"#B0BEC5\"/>"
            + "<circle cx=\"64\" cy=\"50\" r=\"22\" fill=\"#ECEFF1\"/>"
            + "<path d=\"M24 110c6-22 22-34 40-34s34 12 40 34\" fill=\"#ECEFF1\"/></svg>")
            .getBytes(StandardCharsets.UTF_8);

    private DefaultAvatar() {
    }

    /** "test_dara" → "TD", "sysadmin" → "S"; "?" when the name has no letters or digits. */
    public static String initials(String userName) {
        if (userName == null) {
            return "?";
        }
        // \p{M} keeps combining marks (e.g. Khmer vowel signs) inside the word instead of splitting it.
        String result = Arrays.stream(userName.split("[^\\p{L}\\p{M}\\p{N}]+"))
                .filter(part -> !part.isEmpty())
                .limit(2)
                .map(part -> new String(Character.toChars(part.codePointAt(0))))
                .reduce("", String::concat)
                .toUpperCase();
        return result.isEmpty() ? "?" : result;
    }

    public static byte[] forUser(String userName) {
        String colour = COLOURS[Math.floorMod(userName == null ? 0 : userName.hashCode(), COLOURS.length)];
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\" width=\"128\" height=\"128\">"
                + "<circle cx=\"64\" cy=\"64\" r=\"64\" fill=\"" + colour + "\"/>"
                + "<text x=\"64\" y=\"64\" dy=\".35em\" text-anchor=\"middle\" fill=\"#FFFFFF\""
                + " font-family=\"Arial, Helvetica, sans-serif\" font-size=\"52\" font-weight=\"600\">"
                + escapeXml(initials(userName)) + "</text></svg>";
        return svg.getBytes(StandardCharsets.UTF_8);
    }

    public static byte[] silhouette() {
        return SILHOUETTE.clone();
    }

    private static String escapeXml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
