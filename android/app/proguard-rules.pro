# Reglas de ProGuard para Tableros Selectric
-keepattributes Signature
-keepattributes *Annotation*

# Retrofit & Gson
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.selectric.tableros.data.remote.dto.** { *; }

# Room
-keep class androidx.room.** { *; }
