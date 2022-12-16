#----------------------------------------------------------------
# Generated CMake target import file for configuration "Release".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "GeographicLib::GeographicLib_SHARED" for configuration "Release"
set_property(TARGET GeographicLib::GeographicLib_SHARED APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(GeographicLib::GeographicLib_SHARED PROPERTIES
  IMPORTED_IMPLIB_RELEASE "${_IMPORT_PREFIX}/lib/GeographicLib-i.lib"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/bin/GeographicLib.dll"
  )

list(APPEND _cmake_import_check_targets GeographicLib::GeographicLib_SHARED )
list(APPEND _cmake_import_check_files_for_GeographicLib::GeographicLib_SHARED "${_IMPORT_PREFIX}/lib/GeographicLib-i.lib" "${_IMPORT_PREFIX}/bin/GeographicLib.dll" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
