#----------------------------------------------------------------
# Generated CMake target import file for configuration "Debug".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "GeographicLib::GeographicLib_SHARED" for configuration "Debug"
set_property(TARGET GeographicLib::GeographicLib_SHARED APPEND PROPERTY IMPORTED_CONFIGURATIONS DEBUG)
set_target_properties(GeographicLib::GeographicLib_SHARED PROPERTIES
  IMPORTED_IMPLIB_DEBUG "${_IMPORT_PREFIX}/debug/lib/GeographicLib_d-i.lib"
  IMPORTED_LOCATION_DEBUG "${_IMPORT_PREFIX}/debug/bin/GeographicLib_d.dll"
  )

list(APPEND _cmake_import_check_targets GeographicLib::GeographicLib_SHARED )
list(APPEND _cmake_import_check_files_for_GeographicLib::GeographicLib_SHARED "${_IMPORT_PREFIX}/debug/lib/GeographicLib_d-i.lib" "${_IMPORT_PREFIX}/debug/bin/GeographicLib_d.dll" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
