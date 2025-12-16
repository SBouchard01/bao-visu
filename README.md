# BAO Visualisation

This project contains a web-based visualization of Baryon Acoustic Oscillations (BAO) in the large-scale structure of the universe. It aims to provide an educational tool to understand cosmological concepts through interactive graphics.

> [!WARNING]
> This visualization uses several physical approximations and visual tricks to balance scientific accuracy with clarity and performance. For detailed explanations of these choices, please refer to the [Physics Guide](doc.html?file=PHYSICS.md) and [Visual Guide](doc.html?file=VISUAL.md).

## Documentation
The codebase is documented in the following files:
- [Code Implementation Guide](gemini-v1/CODE.md): Overview of the code structure and logic.
- [Physics Guide](gemini-v1/PHYSICS.md): Details of the physical models and equations used.
- [Visual Guide](bao-visu/NOTE.md): Explanation of visual approximations and "magic numbers". 

## Running the Visualization
To run the visualization, simply open the `index.html` file in a modern web browser. No build tools or server setup are required, as it is a vanilla JavaScript application.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## The challenge
This project was created as part of a small challenge we set with @nicosmo to build a complete web application using only AI-generated code. The goal was to explore the capabilities and limitations of AI in software development, particularly in generating complex scientific visualizations.

### AI-generated version - Copilot / Gemini
This tool was first implemented with the `gemini` Google AI model trough Copilot.

I will rework this project with my own implementation later on to compare the approaches and implementation times between AI-generated code and human-written code. 

The AI-generated tool can be found in the `gemini-v1` folder, and can be accessed at <sbouchar.github.io/bao-visu/gemini-v1/>.