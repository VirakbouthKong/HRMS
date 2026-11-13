package HRMS.Auth_Service.util;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class DefaultAvatarTest {

    @Test
    void initials_twoPartsSeparatedByUnderscore() {
        assertThat(DefaultAvatar.initials("test_dara")).isEqualTo("TD");
    }

    @Test
    void initials_singleWord() {
        assertThat(DefaultAvatar.initials("sysadmin")).isEqualTo("S");
    }

    @Test
    void initials_digitsStayPartOfTheWord() {
        assertThat(DefaultAvatar.initials("admin2")).isEqualTo("A");
    }

    @Test
    void initials_dotSeparated() {
        assertThat(DefaultAvatar.initials("rina.ly")).isEqualTo("RL");
    }

    @Test
    void initials_onlyFirstTwoParts() {
        assertThat(DefaultAvatar.initials("a_b_c")).isEqualTo("AB");
    }

    @Test
    void initials_noLettersOrDigits() {
        assertThat(DefaultAvatar.initials("___")).isEqualTo("?");
    }

    @Test
    void initials_khmerUsesFirstCharacter() {
        assertThat(DefaultAvatar.initials("សុខា")).isEqualTo("ស");
    }

    @Test
    void forUser_isSvgShowingTheInitials() {
        String svg = new String(DefaultAvatar.forUser("test_dara"), StandardCharsets.UTF_8);

        assertThat(svg).startsWith("<svg").contains(">TD<");
        assertThat(DefaultAvatar.CONTENT_TYPE).isEqualTo("image/svg+xml");
    }

    @Test
    void forUser_sameUserGetsTheSameAvatar() {
        assertThat(DefaultAvatar.forUser("test_dara")).isEqualTo(DefaultAvatar.forUser("test_dara"));
    }

    @Test
    void silhouette_isSvg() {
        assertThat(new String(DefaultAvatar.silhouette(), StandardCharsets.UTF_8)).startsWith("<svg");
    }
}
