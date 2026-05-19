# Proguard Rules untuk VFD [VocFullDisplay]

# Jaga keaslian WebKit agar antarmuka JS JavaScript interface tidak terpotong saat kompresi
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class android.webkit.** { *; }

# Jaga resource material design
-keep class com.google.android.material.** { *; }
-dontwarn com.google.android.material.**
