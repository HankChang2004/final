#!/bin/bash
set -e

VIDEODIR=$1

# Source conda
source ~/miniconda3/etc/profile.d/conda.sh

# Run AlphaPose
conda activate alphapose
cd ~/AlphaPose
bash scripts/inference.sh "${VIDEODIR}" ~/project/alphapose_output/
conda deactivate
rm -f ~/AlphaPose/examples/demo/output_fixed.mp4

# Run MotionBERT
conda activate motionbert
cd ~/MotionBERT
python infer_wild.py --vid_path "${VIDEODIR}" --json_path ~/project/alphapose_output/alphapose-results.json --out_path ~/project/motionbert_output/
conda deactivate