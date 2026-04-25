package com.example.moneyjar.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = Mint80,
    secondary = Moss80,
    tertiary = Coral80,
    background = SurfaceDark,
    surface = SurfaceDark,
    onBackground = SurfaceLight,
    onSurface = SurfaceLight,
)

private val LightColorScheme = lightColorScheme(
    primary = Mint40,
    secondary = Moss40,
    tertiary = Coral40,
    background = SurfaceLight,
    surface = SurfaceLight,
    onBackground = InkDark,
    onSurface = InkDark,
)

@Composable
fun MoneyJarTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
