#!/usr/bin/env bash
od -A n -t d4 --endian=big "$@"
